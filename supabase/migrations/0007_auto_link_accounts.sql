-- ============================================================================
-- YuenDeaw People OS — 0007 auto-link accounts <-> employee records by email
-- Onboarding flow: HR adds an employee (with email) → person signs up with the
-- same email → their login is auto-linked to the employee record (profile,
-- leave, quests all work). Works in either order.
-- ============================================================================

-- On signup: create app_users row + link an existing employee with same email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email, full_name, avatar_url, is_owner)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email = 'gap@standnextstage.com'
  )
  on conflict (id) do nothing;

  update public.employees
    set user_id = new.id
    where lower(email) = lower(new.email) and user_id is null;

  return new;
end; $$;

-- When HR creates/edits an employee with an email, link to an existing account
create or replace function public.link_employee_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null and new.email is not null then
    select id into new.user_id from public.app_users where lower(email) = lower(new.email) limit 1;
  end if;
  return new;
end; $$;

drop trigger if exists trg_link_employee on public.employees;
create trigger trg_link_employee
  before insert or update of email on public.employees
  for each row execute function public.link_employee_account();

-- One-time backfill for accounts/employees already created
update public.employees e
  set user_id = a.id
  from public.app_users a
  where lower(e.email) = lower(a.email) and e.user_id is null;
