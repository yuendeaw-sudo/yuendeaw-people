-- ===========================================================================
-- บัญชีโซเชียล / แบรนด์ — ทะเบียนสินทรัพย์แบรนด์ + คุมสิทธิ์เข้าถึง
-- (แยกจาก subscriptions: เน้นความเป็นเจ้าของ/2FA/กู้คืน/ใครมีสิทธิ์ admin)
-- ============================================================================
create table if not exists public.social_accounts (
  id                   uuid primary key default gen_random_uuid(),
  platform             text not null,            -- facebook|instagram|tiktok|youtube|line_oa|x|threads|other
  name                 text not null,            -- ชื่อเพจ/บัญชี
  handle               text,                     -- @handle
  url                  text,
  account_id           uuid references public.subscription_accounts(id) on delete set null, -- อีเมล GSuite ที่ใช้ล็อกอิน
  login_email          text,                     -- เผื่อล็อกอินด้วยอีเมลอื่น
  owner_id             uuid references public.employees(id) on delete set null, -- ผู้ดูแลคอนเทนต์
  admin_ids            jsonb not null default '[]'::jsonb,  -- พนักงานที่มีสิทธิ์ admin (employee ids)
  twofa_status         text,
  recovery_email       text,
  recovery_phone       text,
  followers            text,
  password_manager_ref text,
  status               text default 'active',    -- active|inactive
  note                 text,
  created_at           timestamptz not null default now()
);
alter table public.social_accounts enable row level security;

drop policy if exists social_read on public.social_accounts;
create policy social_read on public.social_accounts for select to authenticated
  using (public.auth_has_perm('subscriptions','view') or public.auth_has_perm('finance','view'));
drop policy if exists social_write on public.social_accounts;
create policy social_write on public.social_accounts for all to authenticated
  using (public.auth_has_perm('subscriptions','edit')) with check (public.auth_has_perm('subscriptions','edit'));
