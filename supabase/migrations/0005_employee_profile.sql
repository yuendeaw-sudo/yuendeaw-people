-- ============================================================================
-- YuenDeaw People OS — 0005 employee profile fields
-- Extends the employee record to a full HR file (FlowAccount-style tabs):
-- identity (national id, passport, birth date, EN names), contact (line, address),
-- and bank/payment details. Sensitive fields are gated in the app by
-- people:sensitive_view (national_id, passport_no, birth_date, bank_*).
-- ============================================================================

alter table public.employees
  add column if not exists first_name_en   text,
  add column if not exists last_name_en    text,
  add column if not exists nickname_en     text,
  add column if not exists national_id     text,
  add column if not exists passport_no     text,
  add column if not exists birth_date      date,
  add column if not exists line_id         text,
  add column if not exists address         text,
  add column if not exists bank_name       text,
  add column if not exists bank_account    text,
  add column if not exists bank_account_type text,
  add column if not exists bank_branch     text;
