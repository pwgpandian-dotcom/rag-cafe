-- =====================================================================
-- RagCafe — 002: register_employee()
-- Called once, right after an employee signs up via Supabase Auth.
-- Atomically: resolves employer from code -> creates profile (EMPLOYEE)
--             -> creates wallet seeded with the employer's monthly credit
--             -> writes the opening CREDIT ledger entry.
-- security definer = bypasses RLS safely (same pattern as place_order).
--
-- Call from the app, right after sign-up succeeds:
--   supabase.rpc('register_employee', {
--     p_employer_code: 'JOSA2026', p_emp_code: 'E1042', p_full_name: 'Ravi'
--   })
-- =====================================================================
create or replace function register_employee(
  p_employer_code text,
  p_emp_code      text,
  p_full_name     text
)
returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_employer employers%rowtype;
  v_profile  profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- already registered? just return the existing profile (idempotent)
  select * into v_profile from profiles where id = auth.uid();
  if v_profile.id is not null then
    return v_profile;
  end if;

  -- resolve the company from the code the employee typed
  select * into v_employer
  from employers
  where employer_code = p_employer_code and status = 'ACTIVE';
  if v_employer.id is null then
    raise exception 'Invalid employer code';
  end if;

  -- create the profile
  insert into profiles(id, role, full_name, employer_id, emp_code, email, phone)
  values (
    auth.uid(), 'EMPLOYEE', p_full_name, v_employer.id, p_emp_code,
    (select email from auth.users where id = auth.uid()),
    (select phone from auth.users where id = auth.uid())
  )
  returning * into v_profile;

  -- create the wallet, seeded with the employer's default monthly credit
  insert into wallets(profile_id, employer_id, balance_paise, monthly_limit_paise)
  values (
    auth.uid(), v_employer.id,
    v_employer.default_monthly_credit_paise,
    v_employer.default_monthly_credit_paise
  );

  -- opening ledger entry
  insert into wallet_transactions(wallet_id, type, amount_paise, reason)
  select id, 'CREDIT', v_employer.default_monthly_credit_paise, 'Initial monthly credit'
  from wallets where profile_id = auth.uid();

  return v_profile;
end $$;
