-- ============================================================================
-- YuenDeaw People OS — 0009 payroll fields on employees
-- Social security eligibility + monthly withholding tax, shown on the salary tab.
-- (ประกันสังคม is computed from salary at 5% capped 750/mo; this just stores the
--  enrolment status and the manual withholding-tax amount.)
-- ============================================================================

alter table public.employees
  add column if not exists social_security text default 'enrolled',  -- enrolled | not_enrolled
  add column if not exists withholding_tax numeric(12,2);            -- monthly หัก ณ ที่จ่าย
