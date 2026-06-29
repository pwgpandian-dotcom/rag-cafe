-- =====================================================================
-- RagCafe — 003: employer_billing(p_from, p_to)
-- Month-end billing RPC for the Admin Console.
-- Returns one row per employer: order count + amount owed for the period.
--
-- Uses subsidy_employer_paise (not total_paise) so the 50/50 split model
-- works correctly without a schema change when it ships.
-- CANCELLED orders are excluded — they were refunded back to the wallet.
--
-- Call from the app:
--   supabase.rpc('employer_billing', { p_from: '2026-06-01', p_to: '2026-07-01' })
-- p_to is exclusive (first day of the NEXT month).
-- =====================================================================
create or replace function employer_billing(
  p_from date,
  p_to   date
)
returns table (
  employer_name text,
  order_count   bigint,
  total_paise   bigint
)
language sql security definer set search_path = public as $$
  select
    e.name                                          as employer_name,
    count(o.id)                                     as order_count,
    coalesce(sum(o.subsidy_employer_paise), 0)::bigint as total_paise
  from orders o
  join employers e on e.id = o.employer_id
  where
    o.placed_at >= p_from::timestamptz
    and o.placed_at <  p_to::timestamptz
    and o.status    <> 'CANCELLED'
  group by e.id, e.name
  order by total_paise desc;
$$;
