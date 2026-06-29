-- =====================================================================
-- RagCafe — 003: Atomic Signup Trigger
-- Resolves the "Orphan User" bug by moving profile creation to a 
-- database trigger. This ensures Auth and Profile creation are atomic.
-- =====================================================================

-- 1. Create the trigger function
create or replace function public.handle_new_user_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_employer_code text;
  v_employer_id uuid;
  v_default_credit bigint;
begin
  -- Extract metadata passed from the client during supabase.auth.signUp({ options: { data: { ... } } })
  v_employer_code := new.raw_user_meta_data->>'employer_code';

  -- Validation: In RagCafe, a valid employer code is mandatory for self-signup
  if v_employer_code is null then
    raise exception 'Employer code is required for signup';
  end if;

  -- Resolve the employer and their default credit
  select id, default_monthly_credit_paise 
  into v_employer_id, v_default_credit
  from public.employers
  where employer_code = upper(v_employer_code) and status = 'ACTIVE';

  if v_employer_id is null then
    raise exception 'Invalid or inactive employer code: %', v_employer_code;
  end if;

  -- Create the profile (linked to the new auth.users row)
  insert into public.profiles (
    id, 
    role, 
    full_name, 
    employer_id, 
    emp_code, 
    email, 
    phone
  )
  values (
    new.id,
    'EMPLOYEE',
    new.raw_user_meta_data->>'full_name',
    v_employer_id,
    new.raw_user_meta_data->>'emp_code',
    new.email,
    new.phone
  );

  -- Create the wallet, seeded with the employer's default monthly credit
  insert into public.wallets (
    profile_id, 
    employer_id, 
    balance_paise, 
    monthly_limit_paise
  )
  values (
    new.id, 
    v_employer_id, 
    v_default_credit, 
    v_default_credit
  );

  -- Opening ledger entry
  insert into public.wallet_transactions (wallet_id, type, amount_paise, reason)
  select id, 'CREDIT', v_default_credit, 'Initial monthly credit'
  from public.wallets where profile_id = new.id;

  return new;
exception
  when others then
    -- Raising an exception here rolls back the ENTIRE transaction,
    -- meaning the auth.users row will NOT be created. No orphan users.
    raise exception 'RagCafe Setup Error: %', sqlerrm;
end;
$$;

-- 2. Attach the trigger to auth.users
-- It must be AFTER INSERT to respect foreign key constraints in public.profiles
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_signup();
