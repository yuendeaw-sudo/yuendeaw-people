-- ===========================================================================
-- บัญชีล็อกอิน/กลุ่ม (เช่น GSuite) — ใช้จัดกลุ่ม subscription ที่ล็อกอินผ่านบัญชีเดียวกัน
-- ============================================================================
create table if not exists public.subscription_accounts (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  label      text not null,
  kind       text default 'gsuite',     -- gsuite | other
  note       text,
  created_at timestamptz not null default now()
);
alter table public.subscription_accounts enable row level security;

drop policy if exists subacc_read on public.subscription_accounts;
create policy subacc_read on public.subscription_accounts for select to authenticated
  using (public.auth_has_perm('subscriptions','view') or public.auth_has_perm('finance','view'));
drop policy if exists subacc_write on public.subscription_accounts;
create policy subacc_write on public.subscription_accounts for all to authenticated
  using (public.auth_has_perm('subscriptions','edit')) with check (public.auth_has_perm('subscriptions','edit'));

-- ===========================================================================
-- วิธีการจ่ายเงิน (บัตรเครดิต) — เก็บแค่ชื่อบัตร + 4 ตัวท้าย (ไม่เก็บเลขเต็มเพื่อความปลอดภัย)
-- ============================================================================
create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,            -- ชื่อเล่นบัตร เช่น "บัตร KBank บริษัท"
  holder_name text,                     -- ชื่อบนบัตร
  last4       text,                     -- 4 ตัวท้าย (ห้ามเก็บเลขเต็ม)
  brand       text,                     -- Visa / Mastercard / ...
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.payment_methods enable row level security;

drop policy if exists pm_read on public.payment_methods;
create policy pm_read on public.payment_methods for select to authenticated
  using (public.auth_has_perm('subscriptions','view') or public.auth_has_perm('finance','view'));
drop policy if exists pm_write on public.payment_methods;
create policy pm_write on public.payment_methods for all to authenticated
  using (public.auth_has_perm('subscriptions','edit')) with check (public.auth_has_perm('subscriptions','edit'));

-- ===========================================================================
-- subscriptions: เพิ่มสกุลเงิน + บัญชีล็อกอิน + วิธีจ่ายเงิน
-- ============================================================================
alter table public.subscriptions add column if not exists currency text default 'THB';
alter table public.subscriptions add column if not exists account_id uuid references public.subscription_accounts(id) on delete set null;
alter table public.subscriptions add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;

-- seed: ทีม "ทั้งออฟฟิศ" + บัญชี GSuite/ส่วนตัวที่ใช้ล็อกอิน
insert into public.teams (name)
  select 'ทั้งออฟฟิศ (ทุกแผนก)'
  where not exists (select 1 from public.teams where name = 'ทั้งออฟฟิศ (ทุกแผนก)');

insert into public.subscription_accounts (email, label, kind) values
  ('addgap@gmail.com',            'แก๊ป (Gmail ส่วนตัว)',        'gsuite'),
  ('admin@standnextstage.com',    'admin@standnextstage.com',     'gsuite'),
  ('creative@standnextstage.com', 'creative@standnextstage.com',  'gsuite'),
  ('editor@standnextstage.com',   'editor@standnextstage.com',    'gsuite'),
  ('gap@standnextstage.com',      'gap@standnextstage.com',       'gsuite')
on conflict (email) do nothing;
