-- =====================================================================
-- RagCafe — MVP Database Schema (Supabase / PostgreSQL)
-- =====================================================================
-- Scope: the core loop only.
--   employer -> employees (credit wallet) -> outlets/sections -> menu items
--   -> place order (against credit) -> QR/token -> counter marks collected
--   -> month-end: sum of debits per employer = invoice amount.
--
-- NOT in this MVP (comes later, after real users):
--   meal-card rails, GST/TDS/TCS engine, settlement/payout, multi-vendor,
--   Kafka, microservices, B2C delivery, polls, NLP search, forecasting.
--
-- Money is ALWAYS stored as integer paise (bigint). Never floats.
-- Run this whole file in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions & enums
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;   -- for gen_random_uuid()

do $$ begin
  create type user_role     as enum ('EMPLOYEE', 'COUNTER', 'ADMIN');
  create type outlet_kind    as enum ('FOOD', 'JUICE', 'COFFEE', 'OTHER');
  create type veg_type       as enum ('VEG', 'NONVEG', 'EGG');
  create type order_status   as enum ('PLACED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED');
  create type txn_type       as enum ('CREDIT', 'DEBIT');
exception when duplicate_object then null; end $$;

-- A single sequence for human-readable order numbers (e.g. 10001, 10002...)
create sequence if not exists order_no_seq start with 10001;

-- ---------------------------------------------------------------------
-- 1. Generic updated_at trigger (reused by every table)
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2. Employers (the corporate clients — e.g. "Josalukas")
-- ---------------------------------------------------------------------
create table if not exists employers (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  employer_code            text not null unique,        -- used at employee signup
  gstin                    text,
  address                  text,
  -- default monthly credit each new employee gets (in paise). 0 = none.
  default_monthly_credit_paise bigint not null default 300000,  -- ₹3000
  status                   text not null default 'ACTIVE',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_employers_updated before update on employers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Profiles (one row per auth user — employees AND staff)
--    Linked 1:1 to Supabase auth.users.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'EMPLOYEE',
  full_name     text,
  email         text,
  phone         text,
  -- For EMPLOYEE: which company they belong to + their company emp id.
  -- For COUNTER/ADMIN: employer_id is null (they are RagCafe / cafeteria side).
  employer_id   uuid references employers(id) on delete set null,
  emp_code      text,                          -- employee's id within their company
  status        text not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_profiles_employer on profiles(employer_id);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Wallets (credit we give each employee — NOT money they load)
--    balance_paise = remaining credit they can spend this cycle.
-- ---------------------------------------------------------------------
create table if not exists wallets (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null unique references profiles(id) on delete cascade,
  employer_id         uuid not null references employers(id) on delete cascade,
  balance_paise       bigint not null default 0,
  monthly_limit_paise bigint not null default 0,   -- the cap; reset job tops up to this
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint balance_non_negative check (balance_paise >= 0)
);
create index if not exists idx_wallets_employer on wallets(employer_id);
create trigger trg_wallets_updated before update on wallets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Wallet transactions (the ledger — every credit & debit)
--    Month-end invoice = SUM(DEBIT) per employer for the period.
-- ---------------------------------------------------------------------
create table if not exists wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references wallets(id) on delete cascade,
  order_id     uuid,                            -- set for order debits
  type         txn_type not null,
  amount_paise bigint not null,
  reason       text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_wtxn_wallet on wallet_transactions(wallet_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Outlets / sections (Food, Juice, Coffee... per employer cafeteria)
-- ---------------------------------------------------------------------
create table if not exists outlets (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  name        text not null,
  kind        outlet_kind not null default 'FOOD',
  status      text not null default 'ACTIVE',
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_outlets_employer on outlets(employer_id, sort);
create trigger trg_outlets_updated before update on outlets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Menu items (what's sold at each section)
-- ---------------------------------------------------------------------
create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  outlet_id    uuid not null references outlets(id) on delete cascade,
  employer_id  uuid not null references employers(id) on delete cascade,  -- denormalised for fast RLS
  name         text not null,
  description  text,
  veg          veg_type not null default 'VEG',
  price_paise  bigint not null check (price_paise >= 0),
  image_url    text,
  is_available boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_items_outlet on menu_items(outlet_id, sort);
create index if not exists idx_items_employer on menu_items(employer_id);
create trigger trg_items_updated before update on menu_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Orders + order items
--    subsidy split columns are future-proof: MVP = employer 100%.
--    Later (50/50 model) is a DATA change, not a schema change.
-- ---------------------------------------------------------------------
create table if not exists orders (
  id                      uuid primary key default gen_random_uuid(),
  employer_id             uuid not null references employers(id) on delete cascade,
  profile_id              uuid not null references profiles(id) on delete cascade,
  order_no                bigint not null unique,
  token                   text not null,                 -- shown with the QR at pickup
  status                  order_status not null default 'PLACED',
  subtotal_paise          bigint not null,
  subsidy_employer_paise  bigint not null default 0,     -- MVP: = total
  subsidy_employee_paise  bigint not null default 0,     -- MVP: 0
  total_paise             bigint not null,
  placed_at               timestamptz not null default now(),
  preparing_at            timestamptz,
  ready_at                timestamptz,
  collected_at            timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_orders_employer on orders(employer_id, status, placed_at desc);
create index if not exists idx_orders_profile  on orders(profile_id, placed_at desc);
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  menu_item_id    uuid references menu_items(id) on delete set null,
  name_snapshot   text not null,                 -- name frozen at order time
  qty             int not null check (qty > 0),
  unit_price_paise bigint not null,
  line_total_paise bigint not null
);
create index if not exists idx_order_items_order on order_items(order_id);

-- =====================================================================
-- 9. HELPER FUNCTIONS for RLS (security definer = run as owner)
-- =====================================================================
create or replace function current_employer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select employer_id from profiles where id = auth.uid();
$$;

create or replace function current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role::text from profiles where id = auth.uid();
$$;

-- =====================================================================
-- 10. place_order() — the heart of the app
--   - server computes price (NEVER trust the client's price)
--   - checks credit limit (the safety guard)
--   - creates order + items + debits wallet, all in ONE transaction
--   Call from the app:  supabase.rpc('place_order', { p_items: [...] })
--   p_items = [{ "menu_item_id": "...", "qty": 2 }, ...]
-- =====================================================================
create or replace function place_order(p_items jsonb)
returns table(order_id uuid, order_no bigint, token text, total_paise bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_profile   profiles%rowtype;
  v_wallet    wallets%rowtype;
  v_order     orders%rowtype;
  v_menu      menu_items%rowtype;
  v_item      jsonb;
  v_qty       int;
  v_total     bigint := 0;
  v_order_no  bigint;
begin
  -- 1. who is ordering
  select * into v_profile from profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Not authenticated'; end if;
  if v_profile.role <> 'EMPLOYEE' then raise exception 'Only employees can order'; end if;

  -- 2. lock the wallet row so two orders cannot race past the credit check
  select * into v_wallet from wallets where profile_id = v_profile.id for update;
  if v_wallet.id is null then raise exception 'No wallet for this employee'; end if;

  -- 3. compute total from server-side prices, scoped to the employee's company
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_menu from menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and employer_id = v_profile.employer_id
        and is_available = true;
    if v_menu.id is null then raise exception 'Item not available: %', v_item->>'menu_item_id'; end if;
    v_qty := greatest((v_item->>'qty')::int, 1);
    v_total := v_total + (v_menu.price_paise * v_qty);
  end loop;

  if v_total = 0 then raise exception 'Empty order'; end if;

  -- 4. credit check — the safety limit (employer pays this at month end)
  if v_wallet.balance_paise < v_total then
    raise exception 'Insufficient credit: balance % paise, need % paise',
      v_wallet.balance_paise, v_total;
  end if;

  -- 5. create the order (MVP: employer subsidises 100%)
  v_order_no := nextval('order_no_seq');
  insert into orders(employer_id, profile_id, order_no, token, status,
                     subtotal_paise, subsidy_employer_paise, subsidy_employee_paise, total_paise)
  values (v_profile.employer_id, v_profile.id, v_order_no, v_order_no::text, 'PLACED',
          v_total, v_total, 0, v_total)
  returning * into v_order;

  -- 6. line items (price frozen as a snapshot)
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_menu from menu_items where id = (v_item->>'menu_item_id')::uuid;
    v_qty := greatest((v_item->>'qty')::int, 1);
    insert into order_items(order_id, menu_item_id, name_snapshot, qty, unit_price_paise, line_total_paise)
    values (v_order.id, v_menu.id, v_menu.name, v_qty, v_menu.price_paise, v_menu.price_paise * v_qty);
  end loop;

  -- 7. debit the wallet + write the ledger entry
  update wallets set balance_paise = balance_paise - v_total where id = v_wallet.id;
  insert into wallet_transactions(wallet_id, order_id, type, amount_paise, reason)
  values (v_wallet.id, v_order.id, 'DEBIT', v_total, 'Order #' || v_order_no);

  return query select v_order.id, v_order.order_no, v_order.token, v_order.total_paise;
end $$;

-- =====================================================================
-- 11. mark_order_status() — counter staff move the order forward
--    PLACED -> PREPARING -> READY -> COLLECTED  (or CANCELLED -> refund)
--    Cancel refunds the credit back to the wallet.
-- =====================================================================
create or replace function mark_order_status(p_order_id uuid, p_to order_status)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_role  text := current_role_name();
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
begin
  if v_role not in ('COUNTER', 'ADMIN') then
    raise exception 'Only counter/admin can change order status';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;

  if p_to = 'CANCELLED' and v_order.status <> 'COLLECTED' then
    -- refund credit
    select * into v_wallet from wallets where profile_id = v_order.profile_id for update;
    update wallets set balance_paise = balance_paise + v_order.total_paise where id = v_wallet.id;
    insert into wallet_transactions(wallet_id, order_id, type, amount_paise, reason)
    values (v_wallet.id, v_order.id, 'CREDIT', v_order.total_paise, 'Refund order #' || v_order.order_no);
  end if;

  update orders set
    status = p_to,
    preparing_at = case when p_to = 'PREPARING' then now() else preparing_at end,
    ready_at     = case when p_to = 'READY'     then now() else ready_at end,
    collected_at = case when p_to = 'COLLECTED' then now() else collected_at end,
    cancelled_at = case when p_to = 'CANCELLED' then now() else cancelled_at end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end $$;

-- =====================================================================
-- 12. ROW LEVEL SECURITY
--    Hard rule: an employee only ever sees their OWN company's data.
-- =====================================================================
alter table employers           enable row level security;
alter table profiles            enable row level security;
alter table wallets             enable row level security;
alter table wallet_transactions enable row level security;
alter table outlets             enable row level security;
alter table menu_items          enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;

-- profiles: see/update self; admin sees all
create policy profiles_self on profiles for select
  using (id = auth.uid() or current_role_name() = 'ADMIN' or current_role_name() = 'COUNTER');
create policy profiles_update_self on profiles for update
  using (id = auth.uid());

-- employers: employee sees own; staff/admin see all
create policy employers_read on employers for select
  using (id = current_employer_id() or current_role_name() in ('ADMIN','COUNTER'));

-- outlets & menu: employee sees own company's; staff/admin all; admin writes
create policy outlets_read on outlets for select
  using (employer_id = current_employer_id() or current_role_name() in ('ADMIN','COUNTER'));
create policy outlets_admin_write on outlets for all
  using (current_role_name() = 'ADMIN') with check (current_role_name() = 'ADMIN');

create policy items_read on menu_items for select
  using (employer_id = current_employer_id() or current_role_name() in ('ADMIN','COUNTER'));
create policy items_admin_write on menu_items for all
  using (current_role_name() = 'ADMIN') with check (current_role_name() = 'ADMIN');

-- wallets & ledger: employee sees own; admin all
create policy wallets_read on wallets for select
  using (profile_id = auth.uid() or current_role_name() = 'ADMIN');
create policy wtxn_read on wallet_transactions for select
  using (
    current_role_name() = 'ADMIN'
    or wallet_id in (select id from wallets where profile_id = auth.uid())
  );

-- orders: employee sees own; counter/admin see all (to run the counter)
create policy orders_read on orders for select
  using (profile_id = auth.uid() or current_role_name() in ('ADMIN','COUNTER'));
create policy order_items_read on order_items for select
  using (
    current_role_name() in ('ADMIN','COUNTER')
    or order_id in (select id from orders where profile_id = auth.uid())
  );
-- NOTE: employees never INSERT into orders directly — they call place_order().
--       counter never UPDATE orders directly — they call mark_order_status().
--       Both functions are security definer, so they bypass these read policies safely.

-- =====================================================================
-- 13. Quick seed (optional — uncomment to test)
-- =====================================================================
-- insert into employers (name, employer_code, default_monthly_credit_paise)
--   values ('Josalukas', 'JOSA2026', 300000);
-- (Then create auth users in Supabase, insert matching profiles with that
--  employer_id, create their wallets, add outlets + menu_items, and test
--  place_order from the app.)

-- =====================================================================
-- End of MVP schema.
-- =====================================================================
