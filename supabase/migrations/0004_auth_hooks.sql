-- ============================================================================
-- YuenDeaw People OS — 0004 auth hooks
-- Auto-provision an app_users row when an auth user is created.
-- The founder email is auto-flagged is_owner (full access).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email, full_name, avatar_url, is_owner)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email = 'gap@standnextstage.com'   -- founder bootstrap
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote an existing user to owner by email (run manually if needed):
--   update public.app_users set is_owner = true where email = 'gap@standnextstage.com';
