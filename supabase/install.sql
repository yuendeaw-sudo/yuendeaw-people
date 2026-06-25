-- =====================================================================
-- YuenDeaw People OS — FULL INSTALL (run once in Supabase SQL Editor)
-- รวม 0001_init + 0002_rls + 0003_seed + 0004_auth_hooks
-- =====================================================================

-- ============================================================================
-- YuenDeaw People OS — 0001 init
-- Core schema. Designed for ALL phases; Phase 1 runs on it today.
-- Principle: policy is data (configurable by HR), not hard-coded.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ===========================================================================
-- AUTH / ACCOUNT LAYER
-- ===========================================================================
-- app_users mirrors auth.users with app-level profile + owner flag.
create table if not exists public.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  avatar_url  text,
  is_owner    boolean not null default false,   -- Founder/Owner super-access
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_app_users_updated before update on public.app_users
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RBAC — roles, permissions, assignments, per-person overrides
-- ===========================================================================
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,             -- e.g. owner, hr_admin, manager, employee, intern, finance
  name        text not null,
  description text,
  is_system   boolean not null default false,   -- system roles can't be deleted
  created_at  timestamptz not null default now()
);

-- permissions are (module, action) pairs. Configurable; new modules can be added.
create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  module      text not null,                    -- people, time_leave, performance, ...
  action      text not null,                    -- view|create|edit|delete|approve|export|sensitive_view
  description text,
  unique (module, action)
);

create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.employee_roles (
  employee_id uuid not null,                    -- FK added after employees table
  role_id     uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (employee_id, role_id)
);

-- per-person override: explicitly grant or revoke a single permission
create table if not exists public.permission_overrides (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null,                  -- FK added after employees
  module        text not null,
  action        text not null,
  allow         boolean not null,               -- true = grant, false = revoke
  reason        text,
  created_at    timestamptz not null default now(),
  unique (employee_id, module, action)
);

-- ===========================================================================
-- ORG STRUCTURE
-- ===========================================================================
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete set null,
  name          text not null,
  description   text,
  created_at    timestamptz not null default now()
);

-- Employment types DRIVE default policy. policy is JSONB so HR edits w/o code.
create table if not exists public.employment_types (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,            -- full_time, part_time, intern, freelance, ...
  name         text not null,                   -- Thai label
  description  text,
  color        text default '#6C5CE7',
  is_active    boolean not null default true,
  sort_order   int not null default 100,
  -- flexible default policy bundle: leave quota, attendance rules, comp method,
  -- benefits eligibility, kpi template, review cycle, ai access, knowledge level...
  policy       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_employment_types_updated before update on public.employment_types
  for each row execute function public.set_updated_at();

-- The central people record. user_id is NULL for applicants/alumni without login.
create table if not exists public.employees (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique references public.app_users(id) on delete set null,
  employee_code      text unique,
  first_name         text not null,
  last_name          text,
  nickname           text,
  email              text,
  phone              text,
  avatar_url         text,
  employment_type_id uuid references public.employment_types(id) on delete set null,
  department_id      uuid references public.departments(id) on delete set null,
  team_id            uuid references public.teams(id) on delete set null,
  manager_id         uuid references public.employees(id) on delete set null,
  position_title     text,
  work_mode          text,                       -- office|hybrid|remote|production|project|no_fixed
  start_date         date,
  probation_end_date date,
  end_date           date,
  status             text not null default 'active',  -- active|probation|intern|freelance|inactive|alumni|candidate
  emergency_contact  jsonb default '{}'::jsonb,
  -- per-person policy override merged on top of employment_type.policy
  policy_override    jsonb not null default '{}'::jsonb,
  notes              text,                        -- HR/Owner-only (gated by RLS)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_employees_updated before update on public.employees
  for each row execute function public.set_updated_at();
create index if not exists idx_employees_manager on public.employees(manager_id);
create index if not exists idx_employees_team on public.employees(team_id);
create index if not exists idx_employees_status on public.employees(status);

-- deferred FKs onto employees
alter table public.employee_roles
  drop constraint if exists employee_roles_employee_fk,
  add constraint employee_roles_employee_fk
  foreign key (employee_id) references public.employees(id) on delete cascade;
alter table public.permission_overrides
  drop constraint if exists permission_overrides_employee_fk,
  add constraint permission_overrides_employee_fk
  foreign key (employee_id) references public.employees(id) on delete cascade;

-- SENSITIVE: salary / payment info history. Gated by sensitive_view.
create table if not exists public.employee_compensation (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  comp_type      text not null,                  -- monthly_salary|per_show|per_day|hourly|project
  amount         numeric(12,2) not null,
  currency       text not null default 'THB',
  effective_date date not null,
  end_date       date,
  payment_info   jsonb default '{}'::jsonb,       -- bank/account refs (sensitive)
  note           text,
  created_by     uuid references public.app_users(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_comp_employee on public.employee_compensation(employee_id);

-- ===========================================================================
-- DOCUMENTS (Phase 1) + KNOWLEDGE categories (Phase 3-ready)
-- ===========================================================================
create table if not exists public.knowledge_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category_id   uuid references public.knowledge_categories(id) on delete set null,
  employee_id   uuid references public.employees(id) on delete cascade, -- personal doc, else NULL
  doc_type      text,                             -- contract|nda|id|certificate|sop|template|...
  storage_path  text,                             -- Supabase Storage object path
  external_url  text,
  is_sensitive  boolean not null default false,
  visibility    text not null default 'role',     -- public|role|team|owner|self
  uploaded_by   uuid references public.app_users(id),
  created_at    timestamptz not null default now()
);
create index if not exists idx_documents_employee on public.documents(employee_id);

-- ===========================================================================
-- TIME & LEAVE
-- ===========================================================================
create table if not exists public.leave_types (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,             -- sick|personal|annual|unpaid|wfh|onsite|event|halfday|emergency|intern|custom
  name        text not null,
  is_paid     boolean not null default true,
  color       text default '#6C5CE7',
  requires_evidence boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

-- quota/rules per employment_type (or NULL = applies to all) per leave_type
create table if not exists public.leave_policies (
  id                 uuid primary key default gen_random_uuid(),
  leave_type_id      uuid not null references public.leave_types(id) on delete cascade,
  employment_type_id uuid references public.employment_types(id) on delete cascade, -- NULL = all
  annual_quota_days  numeric(5,1),                -- NULL = unlimited / not tracked
  accrual            text not null default 'yearly', -- yearly|monthly|none
  rules              jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  unique (leave_type_id, employment_type_id)
);

create table if not exists public.leave_balances (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year          int not null,
  entitled_days numeric(5,1) not null default 0,
  used_days     numeric(5,1) not null default 0,
  unique (employee_id, leave_type_id, year)
);

create table if not exists public.leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  start_date    date not null,
  end_date      date not null,
  is_half_day   boolean not null default false,
  total_days    numeric(5,1) not null default 1,
  reason        text,
  evidence_path text,
  status        text not null default 'pending', -- pending|approved|rejected|cancelled
  manager_comment text,
  hr_comment    text,
  decided_by    uuid references public.app_users(id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_leave_requests_updated before update on public.leave_requests
  for each row execute function public.set_updated_at();
create index if not exists idx_leave_req_employee on public.leave_requests(employee_id);
create index if not exists idx_leave_req_status on public.leave_requests(status);

create table if not exists public.attendance_records (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  work_date    date not null,
  mode         text,                              -- office|hybrid|production|event|remote|project
  check_in     timestamptz,
  check_out    timestamptz,
  minutes_late int not null default 0,
  status       text not null default 'present',   -- present|late|absent|leave|holiday|wfh
  note         text,
  created_at   timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists idx_attendance_employee on public.attendance_records(employee_id);
create index if not exists idx_attendance_date on public.attendance_records(work_date);

-- ===========================================================================
-- HANDBOOK / POLICY CENTER
-- ===========================================================================
create table if not exists public.handbook_pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text,                             -- Culture|Leave|Conduct|AI|PDPA|...
  body          text,                             -- markdown
  version       int not null default 1,
  is_published  boolean not null default false,
  must_ack      boolean not null default false,   -- mandatory acknowledgement
  audience      jsonb not null default '{}'::jsonb, -- {roles:[],employment_types:[],teams:[]}
  sort_order    int not null default 100,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_handbook_updated before update on public.handbook_pages
  for each row execute function public.set_updated_at();

create table if not exists public.handbook_acknowledgments (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.handbook_pages(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version     int not null,
  acked_at    timestamptz not null default now(),
  unique (page_id, employee_id, version)
);

-- ===========================================================================
-- APPLICATIONS (job + internship) — public intake → pipeline → convert
-- ===========================================================================
create table if not exists public.application_forms (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,             -- job | internship | <position-slug>
  kind         text not null default 'job',      -- job|internship
  title        text not null,
  description  text,
  is_open      boolean not null default true,
  fields       jsonb not null default '[]'::jsonb, -- custom question definitions
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_app_forms_updated before update on public.application_forms
  for each row execute function public.set_updated_at();

create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid references public.application_forms(id) on delete set null,
  kind            text not null default 'job',
  position        text,
  full_name       text not null,
  nickname        text,
  email           text not null,
  phone           text,
  portfolio_url   text,
  resume_path     text,
  expected_salary text,
  available_date  date,
  work_type_pref  text,
  field_interest  text,                           -- production|content|comedy|editing|admin|ai|design|studio
  answers         jsonb not null default '{}'::jsonb, -- custom answers + intern fields
  pdpa_consent    boolean not null default false,
  stage           text not null default 'new',    -- new|reviewing|shortlisted|interview|accepted|rejected|talent_pool|converted_intern|converted_employee
  rating          int,
  reviewer_note   text,
  converted_employee_id uuid references public.employees(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();
create index if not exists idx_applications_stage on public.applications(stage);
create index if not exists idx_applications_kind on public.applications(kind);

-- ===========================================================================
-- AUDIT + NOTIFICATIONS
-- ===========================================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.app_users(id) on delete set null,
  actor_email text,
  action      text not null,                      -- view_salary|edit_leave|add_bonus|delete_document...
  module      text,
  entity      text,                               -- table/entity name
  entity_id   text,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_actor on public.audit_logs(actor_id);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  kind        text default 'info',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id, is_read);

-- ===========================================================================
-- PHASE 2 — Performance / Career / Rewards / Incidents
-- (tables created now so the data model is stable; UI ships in Phase 2)
-- ===========================================================================
create table if not exists public.performance_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                      -- KPI for intern, editor, producer...
  applies_to  jsonb default '{}'::jsonb,           -- {roles,employment_types,teams,positions}
  dimensions  jsonb not null default '[]'::jsonb,  -- [{key,label,weight}] (Output,Quality,...)
  review_cycle text default 'monthly',             -- weekly|monthly|quarterly|probation|project|intern|custom
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create table if not exists public.performance_reviews (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  template_id  uuid references public.performance_templates(id) on delete set null,
  reviewer_id  uuid references public.employees(id) on delete set null,
  cycle        text,
  period_label text,
  status       text not null default 'draft',      -- draft|submitted|finalized
  overall_score numeric(4,2),
  summary      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_perf_reviews_updated before update on public.performance_reviews
  for each row execute function public.set_updated_at();
create table if not exists public.performance_scores (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.performance_reviews(id) on delete cascade,
  dimension   text not null,
  score       numeric(4,2),
  comment     text,
  evidence    jsonb default '[]'::jsonb            -- links/files/tasks/incidents
);
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  author_id   uuid references public.employees(id) on delete set null,
  kind        text default 'note',                -- praise|coaching|peer|client|note
  body        text not null,
  evidence    jsonb default '[]'::jsonb,
  visibility  text not null default 'manager',    -- self|manager|hr|owner
  created_at  timestamptz not null default now()
);

create table if not exists public.career_tracks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                      -- Intern Track, Production Track...
  description text,
  sort_order  int not null default 100
);
create table if not exists public.career_levels (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references public.career_tracks(id) on delete cascade,
  level_order   int not null,
  title         text not null,
  responsibility text,
  required_skill text,
  expected_behavior text,
  evidence_needed text,
  benefits      jsonb default '{}'::jsonb,
  salary_range  jsonb default '{}'::jsonb,          -- admin/owner-only (sensitive)
  access_level  text
);
create table if not exists public.promotion_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  from_level_id uuid references public.career_levels(id) on delete set null,
  to_level_id   uuid references public.career_levels(id) on delete set null,
  proposed_by   uuid references public.employees(id) on delete set null,
  evidence      jsonb default '[]'::jsonb,
  manager_comment text,
  hr_comment    text,
  status        text not null default 'proposed', -- proposed|hr_review|approved|rejected
  effective_date date,
  salary_adjust jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_promotion_updated before update on public.promotion_requests
  for each row execute function public.set_updated_at();

create table if not exists public.benefits (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  category    text,                               -- bonus|welfare|allowance|learning|health|travel|profit_share
  description text,
  is_active   boolean not null default true
);
create table if not exists public.benefit_policies (
  id          uuid primary key default gen_random_uuid(),
  benefit_id  uuid not null references public.benefits(id) on delete cascade,
  conditions  jsonb not null default '{}'::jsonb,  -- {employment_type,role,level,tenure,performance,budget_cap,...}
  created_at  timestamptz not null default now()
);
create table if not exists public.employee_benefits (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  benefit_id  uuid not null references public.benefits(id) on delete cascade,
  granted_at  date,
  expires_at  date,
  details     jsonb default '{}'::jsonb,
  status      text not null default 'active'
);
create table if not exists public.bonus_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  category    text,                               -- performance|spot|project|travel|...
  amount      numeric(12,2),
  reason      text,
  evidence    jsonb default '[]'::jsonb,
  proposed_by uuid references public.employees(id) on delete set null,
  manager_comment text,
  hr_comment  text,
  status      text not null default 'proposed',   -- proposed|hr_review|approved|rejected|paid
  payment_status text default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_bonus_updated before update on public.bonus_requests
  for each row execute function public.set_updated_at();
create table if not exists public.welfare_payments (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  benefit_id  uuid references public.benefits(id) on delete set null,
  amount      numeric(12,2) not null,
  paid_on     date,
  period      text,
  note        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.incidents (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  reported_by   uuid references public.employees(id) on delete set null,
  category      text,                             -- late|quality|deadline|complaint|asset|confidentiality|harassment|fraud|safety|policy|custom
  level         int not null default 1,           -- 1 minor .. 4 critical
  title         text not null,
  description   text,
  evidence      jsonb default '[]'::jsonb,
  employee_explanation text,
  status        text not null default 'open',     -- open|hr_review|awaiting_explanation|decided|closed
  decision      text,
  follow_up_date date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_incidents_updated before update on public.incidents
  for each row execute function public.set_updated_at();
create table if not exists public.corrective_actions (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  action_type text,                               -- verbal|written_warning|improvement_plan|suspension|termination|coaching|none
  details     text,
  due_date    date,
  status      text default 'open',
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- PHASE 3 — AI Workplace + Knowledge
-- ===========================================================================
create table if not exists public.ai_agents (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,
  name         text not null,
  description  text,
  system_prompt text,
  access       jsonb not null default '{}'::jsonb, -- {roles,employment_types,teams} OR {owner_only:true}
  is_active    boolean not null default true,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now()
);
create table if not exists public.prompt_templates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  body        text not null,
  access      jsonb not null default '{}'::jsonb,
  created_by  uuid references public.employees(id) on delete set null,
  created_at  timestamptz not null default now()
);
create table if not exists public.ai_usage_logs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  agent_id    uuid references public.ai_agents(id) on delete set null,
  tokens      int,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- PHASE 4 — Subscriptions + Company Assets
-- ===========================================================================
create table if not exists public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  service_name   text not null,
  account_email  text,
  owner_id       uuid references public.employees(id) on delete set null,
  users_access   jsonb default '[]'::jsonb,
  cost           numeric(12,2),
  billing_cycle  text default 'monthly',          -- monthly|yearly
  billing_date   date,
  renewal_date   date,
  status         text default 'active',
  purpose        text,
  team_id        uuid references public.teams(id) on delete set null,
  twofa_status   text,
  -- NOTE: never store raw passwords; reference a password manager only
  password_manager_ref text,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table if not exists public.company_assets (
  id            uuid primary key default gen_random_uuid(),
  asset_type    text,                              -- laptop|camera|keycard|software|...
  name          text not null,
  serial_number text,
  assigned_to   uuid references public.employees(id) on delete set null,
  assigned_date date,
  return_date   date,
  condition     text,
  location      text,
  photo_path    text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_assets_updated before update on public.company_assets
  for each row execute function public.set_updated_at();


-- ============================================================================
-- YuenDeaw People OS — 0002 RLS + permission helpers
-- Column-level sensitivity (e.g. employees.notes, career_levels.salary_range)
-- is enforced in the app layer; RLS here is row-level.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permission helper functions (SECURITY DEFINER — bypass RLS to read RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees where user_id = auth.uid() limit 1;
$$;

create or replace function public.auth_is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from public.app_users where id = auth.uid()), false);
$$;

-- precedence: owner > explicit revoke > explicit grant > role permission
create or replace function public.auth_has_perm(_module text, _action text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select is_owner from public.app_users where id = auth.uid()), false) then true
    when exists (
      select 1 from public.permission_overrides po
      join public.employees e on e.id = po.employee_id
      where e.user_id = auth.uid() and po.module = _module and po.action = _action and po.allow = false
    ) then false
    when exists (
      select 1 from public.permission_overrides po
      join public.employees e on e.id = po.employee_id
      where e.user_id = auth.uid() and po.module = _module and po.action = _action and po.allow = true
    ) then true
    else exists (
      select 1 from public.employee_roles er
      join public.employees e on e.id = er.employee_id
      join public.role_permissions rp on rp.role_id = er.role_id
      join public.permissions p on p.id = rp.permission_id
      where e.user_id = auth.uid() and p.module = _module and p.action = _action
    )
  end;
$$;

create or replace function public.is_manager_of(_emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees e
    where e.id = _emp and e.manager_id = public.current_employee_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ===========================================================================
-- Reference/config tables — readable by any authenticated user,
-- writable only with admin_settings:edit
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'roles','permissions','role_permissions','employment_types','departments',
    'teams','leave_types','leave_policies','knowledge_categories',
    'performance_templates','career_tracks','career_levels','benefits','benefit_policies'
  ] loop
    execute format('drop policy if exists %1$s_read on public.%1$s;', t);
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (true);', t);
    execute format('drop policy if exists %1$s_write on public.%1$s;', t);
    execute format($p$create policy %1$s_write on public.%1$s for all to authenticated
      using (public.auth_has_perm('admin_settings','edit'))
      with check (public.auth_has_perm('admin_settings','edit'));$p$, t);
  end loop;
end $$;

-- ===========================================================================
-- app_users
-- ===========================================================================
drop policy if exists app_users_read on public.app_users;
create policy app_users_read on public.app_users for select to authenticated
  using (id = auth.uid() or public.auth_has_perm('people','view'));
drop policy if exists app_users_self_update on public.app_users;
create policy app_users_self_update on public.app_users for update to authenticated
  using (id = auth.uid() or public.auth_has_perm('people','edit'))
  with check (id = auth.uid() or public.auth_has_perm('people','edit'));

-- ===========================================================================
-- employees
-- ===========================================================================
drop policy if exists employees_read on public.employees;
create policy employees_read on public.employees for select to authenticated
  using (
    id = public.current_employee_id()
    or manager_id = public.current_employee_id()
    or public.auth_has_perm('people','view')
  );
drop policy if exists employees_write on public.employees;
create policy employees_write on public.employees for all to authenticated
  using (public.auth_has_perm('people','edit'))
  with check (public.auth_has_perm('people','create') or public.auth_has_perm('people','edit'));

-- employee_compensation (SENSITIVE)
drop policy if exists comp_read on public.employee_compensation;
create policy comp_read on public.employee_compensation for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('people','sensitive_view'));
drop policy if exists comp_write on public.employee_compensation;
create policy comp_write on public.employee_compensation for all to authenticated
  using (public.auth_has_perm('people','sensitive_view'))
  with check (public.auth_has_perm('people','sensitive_view'));

-- employee_roles / permission_overrides — admin only
drop policy if exists emp_roles_rw on public.employee_roles;
create policy emp_roles_rw on public.employee_roles for all to authenticated
  using (public.auth_has_perm('admin_settings','edit'))
  with check (public.auth_has_perm('admin_settings','edit'));
drop policy if exists emp_roles_self_read on public.employee_roles;
create policy emp_roles_self_read on public.employee_roles for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('admin_settings','view'));

drop policy if exists perm_ovr_rw on public.permission_overrides;
create policy perm_ovr_rw on public.permission_overrides for all to authenticated
  using (public.auth_has_perm('admin_settings','edit'))
  with check (public.auth_has_perm('admin_settings','edit'));

-- ===========================================================================
-- documents
-- ===========================================================================
drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select to authenticated
  using (
    (employee_id = public.current_employee_id() and is_sensitive = false)
    or public.auth_has_perm('knowledge','view')
    or public.auth_has_perm('people','sensitive_view')
  );
drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents for all to authenticated
  using (public.auth_has_perm('knowledge','edit') or public.auth_has_perm('people','edit'))
  with check (public.auth_has_perm('knowledge','create') or public.auth_has_perm('people','edit'));

-- ===========================================================================
-- TIME & LEAVE
-- ===========================================================================
drop policy if exists leave_balances_read on public.leave_balances;
create policy leave_balances_read on public.leave_balances for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('time_leave','view'));
drop policy if exists leave_balances_write on public.leave_balances;
create policy leave_balances_write on public.leave_balances for all to authenticated
  using (public.auth_has_perm('time_leave','edit'))
  with check (public.auth_has_perm('time_leave','edit'));

drop policy if exists leave_req_read on public.leave_requests;
create policy leave_req_read on public.leave_requests for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('time_leave','view'));
drop policy if exists leave_req_insert on public.leave_requests;
create policy leave_req_insert on public.leave_requests for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.auth_has_perm('time_leave','create'));
drop policy if exists leave_req_update on public.leave_requests;
create policy leave_req_update on public.leave_requests for update to authenticated
  using (
    (employee_id = public.current_employee_id())
    or public.is_manager_of(employee_id)
    or public.auth_has_perm('time_leave','approve')
    or public.auth_has_perm('time_leave','edit')
  )
  with check (true);
drop policy if exists leave_req_delete on public.leave_requests;
create policy leave_req_delete on public.leave_requests for delete to authenticated
  using (public.auth_has_perm('time_leave','delete'));

drop policy if exists attendance_read on public.attendance_records;
create policy attendance_read on public.attendance_records for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('time_leave','view'));
drop policy if exists attendance_write on public.attendance_records;
create policy attendance_write on public.attendance_records for all to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('time_leave','edit'))
  with check (employee_id = public.current_employee_id() or public.auth_has_perm('time_leave','edit'));

-- ===========================================================================
-- HANDBOOK
-- ===========================================================================
drop policy if exists handbook_read on public.handbook_pages;
create policy handbook_read on public.handbook_pages for select to authenticated
  using (is_published = true or public.auth_has_perm('handbook','edit'));
drop policy if exists handbook_write on public.handbook_pages;
create policy handbook_write on public.handbook_pages for all to authenticated
  using (public.auth_has_perm('handbook','edit'))
  with check (public.auth_has_perm('handbook','create') or public.auth_has_perm('handbook','edit'));

drop policy if exists handbook_ack_read on public.handbook_acknowledgments;
create policy handbook_ack_read on public.handbook_acknowledgments for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('handbook','view'));
drop policy if exists handbook_ack_insert on public.handbook_acknowledgments;
create policy handbook_ack_insert on public.handbook_acknowledgments for insert to authenticated
  with check (employee_id = public.current_employee_id());

-- ===========================================================================
-- APPLICATIONS — public intake
-- ===========================================================================
drop policy if exists app_forms_read on public.application_forms;
create policy app_forms_read on public.application_forms for select to anon, authenticated
  using (is_open = true or public.auth_has_perm('applications','view'));
drop policy if exists app_forms_write on public.application_forms;
create policy app_forms_write on public.application_forms for all to authenticated
  using (public.auth_has_perm('applications','edit'))
  with check (public.auth_has_perm('applications','edit'));

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to anon, authenticated
  with check (pdpa_consent = true);
drop policy if exists applications_read on public.applications;
create policy applications_read on public.applications for select to authenticated
  using (public.auth_has_perm('applications','view'));
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated
  using (public.auth_has_perm('applications','edit'))
  with check (public.auth_has_perm('applications','edit'));
drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated
  using (public.auth_has_perm('applications','delete'));

-- ===========================================================================
-- AUDIT + NOTIFICATIONS
-- ===========================================================================
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
  using (public.auth_has_perm('admin_settings','view'));
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert to authenticated with check (true);

drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert to authenticated with check (true);

-- ===========================================================================
-- PHASE 2 — performance / career / rewards / incidents
-- ===========================================================================
-- performance reviews/scores: self-read + performance perm
drop policy if exists perf_reviews_read on public.performance_reviews;
create policy perf_reviews_read on public.performance_reviews for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('performance','view'));
drop policy if exists perf_reviews_write on public.performance_reviews;
create policy perf_reviews_write on public.performance_reviews for all to authenticated
  using (public.auth_has_perm('performance','edit'))
  with check (public.auth_has_perm('performance','create') or public.auth_has_perm('performance','edit'));

drop policy if exists perf_scores_read on public.performance_scores;
create policy perf_scores_read on public.performance_scores for select to authenticated
  using (exists (select 1 from public.performance_reviews r where r.id = review_id
    and (r.employee_id = public.current_employee_id() or public.auth_has_perm('performance','view'))));
drop policy if exists perf_scores_write on public.performance_scores;
create policy perf_scores_write on public.performance_scores for all to authenticated
  using (public.auth_has_perm('performance','edit')) with check (public.auth_has_perm('performance','edit'));

drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('performance','view'));
drop policy if exists feedback_write on public.feedback;
create policy feedback_write on public.feedback for all to authenticated
  using (public.auth_has_perm('performance','edit')) with check (public.auth_has_perm('performance','create') or public.auth_has_perm('performance','edit'));

drop policy if exists promotion_read on public.promotion_requests;
create policy promotion_read on public.promotion_requests for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('growth','view'));
drop policy if exists promotion_write on public.promotion_requests;
create policy promotion_write on public.promotion_requests for all to authenticated
  using (public.auth_has_perm('growth','edit') or public.auth_has_perm('growth','approve'))
  with check (public.auth_has_perm('growth','create') or public.auth_has_perm('growth','edit') or public.auth_has_perm('growth','approve'));

-- rewards: catalog readable; ledger self-read + rewards perm
drop policy if exists emp_benefits_read on public.employee_benefits;
create policy emp_benefits_read on public.employee_benefits for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('rewards','view'));
drop policy if exists emp_benefits_write on public.employee_benefits;
create policy emp_benefits_write on public.employee_benefits for all to authenticated
  using (public.auth_has_perm('rewards','edit')) with check (public.auth_has_perm('rewards','edit'));

drop policy if exists bonus_read on public.bonus_requests;
create policy bonus_read on public.bonus_requests for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.auth_has_perm('rewards','view'));
drop policy if exists bonus_write on public.bonus_requests;
create policy bonus_write on public.bonus_requests for all to authenticated
  using (public.auth_has_perm('rewards','edit') or public.auth_has_perm('rewards','approve'))
  with check (public.auth_has_perm('rewards','create') or public.auth_has_perm('rewards','edit') or public.auth_has_perm('rewards','approve'));

drop policy if exists welfare_read on public.welfare_payments;
create policy welfare_read on public.welfare_payments for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('finance','view') or public.auth_has_perm('rewards','view'));
drop policy if exists welfare_write on public.welfare_payments;
create policy welfare_write on public.welfare_payments for all to authenticated
  using (public.auth_has_perm('rewards','edit') or public.auth_has_perm('finance','edit'))
  with check (public.auth_has_perm('rewards','edit') or public.auth_has_perm('finance','edit'));

-- incidents (HIGH sensitivity) — incidents perm only (owner via auth_has_perm)
drop policy if exists incidents_rw on public.incidents;
create policy incidents_rw on public.incidents for all to authenticated
  using (public.auth_has_perm('incidents','view'))
  with check (public.auth_has_perm('incidents','create') or public.auth_has_perm('incidents','edit'));
drop policy if exists corrective_rw on public.corrective_actions;
create policy corrective_rw on public.corrective_actions for all to authenticated
  using (public.auth_has_perm('incidents','view'))
  with check (public.auth_has_perm('incidents','edit'));

-- ===========================================================================
-- PHASE 3 — AI Workplace + knowledge (access filtered in app by `access` jsonb)
-- ===========================================================================
drop policy if exists ai_agents_read on public.ai_agents;
create policy ai_agents_read on public.ai_agents for select to authenticated
  using (is_active = true or public.auth_has_perm('ai_workplace','edit'));
drop policy if exists ai_agents_write on public.ai_agents;
create policy ai_agents_write on public.ai_agents for all to authenticated
  using (public.auth_has_perm('ai_workplace','edit')) with check (public.auth_has_perm('ai_workplace','edit'));

drop policy if exists prompts_read on public.prompt_templates;
create policy prompts_read on public.prompt_templates for select to authenticated using (true);
drop policy if exists prompts_write on public.prompt_templates;
create policy prompts_write on public.prompt_templates for all to authenticated
  using (public.auth_has_perm('ai_workplace','edit') or created_by = public.current_employee_id())
  with check (public.auth_has_perm('ai_workplace','create') or created_by = public.current_employee_id());

drop policy if exists ai_usage_read on public.ai_usage_logs;
create policy ai_usage_read on public.ai_usage_logs for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('ai_workplace','view'));
drop policy if exists ai_usage_insert on public.ai_usage_logs;
create policy ai_usage_insert on public.ai_usage_logs for insert to authenticated with check (true);

-- ===========================================================================
-- PHASE 4 — subscriptions + assets
-- ===========================================================================
drop policy if exists subs_read on public.subscriptions;
create policy subs_read on public.subscriptions for select to authenticated
  using (public.auth_has_perm('subscriptions','view') or public.auth_has_perm('finance','view'));
drop policy if exists subs_write on public.subscriptions;
create policy subs_write on public.subscriptions for all to authenticated
  using (public.auth_has_perm('subscriptions','edit')) with check (public.auth_has_perm('subscriptions','edit'));

drop policy if exists assets_read on public.company_assets;
create policy assets_read on public.company_assets for select to authenticated
  using (assigned_to = public.current_employee_id() or public.auth_has_perm('assets','view'));
drop policy if exists assets_write on public.company_assets;
create policy assets_write on public.company_assets for all to authenticated
  using (public.auth_has_perm('assets','edit')) with check (public.auth_has_perm('assets','edit'));


-- ============================================================================
-- YuenDeaw People OS — 0003 seed (defaults). Idempotent where practical.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permissions matrix: modules × standard actions, + sensitive_view for some
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action)
select m, a
from (values
  ('dashboard'),('profile'),('people'),('time_leave'),('applications'),
  ('performance'),('growth'),('rewards'),('handbook'),('incidents'),
  ('ai_workplace'),('knowledge'),('subscriptions'),('assets'),
  ('owner_room'),('admin_settings'),('finance'),('sponsor_sales')
) as mods(m)
cross join (values ('view'),('create'),('edit'),('delete'),('approve'),('export')) as acts(a)
on conflict (module, action) do nothing;

insert into public.permissions (module, action)
select m, 'sensitive_view'
from (values ('people'),('finance'),('incidents'),('rewards')) v(m)
on conflict (module, action) do nothing;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
insert into public.roles (key, name, description, is_system) values
  ('owner',    'เจ้าของ / Founder', 'เข้าถึงทุกอย่าง', true),
  ('hr_admin', 'HR Admin', 'จัดการบุคคล นโยบาย เอกสาร การสมัคร', true),
  ('manager',  'Manager / Team Lead', 'ดูแลเฉพาะทีมตัวเอง อนุมัติลา ให้ feedback', true),
  ('finance',  'Finance', 'ดูแลเงินเดือน สวัสดิการ ค่าใช้จ่าย', true),
  ('employee', 'พนักงาน', 'พนักงานทั่วไป', true),
  ('intern',   'เด็กฝึกงาน', 'นักศึกษาฝึกงาน', true)
on conflict (key) do nothing;

-- owner: ALL permissions (owner flag also grants all, this is belt-and-braces)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key = 'owner'
on conflict do nothing;

-- hr_admin: everything except sponsor_sales + owner_room
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module not in ('sponsor_sales','owner_room')
where r.key = 'hr_admin'
on conflict do nothing;

-- finance: people view + sensitive, finance, rewards view, subscriptions/assets view
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on (
     (p.module = 'people' and p.action in ('view','sensitive_view','export'))
  or (p.module = 'finance')
  or (p.module = 'rewards' and p.action in ('view','export'))
  or (p.module = 'subscriptions' and p.action in ('view','edit','export'))
  or (p.module = 'assets' and p.action = 'view')
  or (p.module in ('dashboard','profile','handbook','knowledge') and p.action = 'view')
)
where r.key = 'finance'
on conflict do nothing;

-- manager: team-scoped approvals + proposals
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on (
     (p.module = 'people' and p.action = 'view')
  or (p.module = 'time_leave' and p.action in ('view','approve'))
  or (p.module = 'performance' and p.action in ('view','create','edit'))
  or (p.module = 'growth' and p.action in ('view','create'))
  or (p.module = 'rewards' and p.action in ('view','create'))
  or (p.module = 'incidents' and p.action in ('create'))
  or (p.module in ('dashboard','profile','handbook','knowledge','ai_workplace') and p.action = 'view')
)
where r.key = 'manager'
on conflict do nothing;

-- employee / intern: light read perms (own data is reachable via RLS self-rules)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on (
  p.module in ('dashboard','profile','handbook','knowledge','ai_workplace','time_leave') and p.action = 'view'
)
where r.key in ('employee','intern')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Employment types (HR can add/edit later). policy is the flexible default bundle.
-- ---------------------------------------------------------------------------
insert into public.employment_types (key, name, description, color, sort_order, policy) values
  ('full_time',    'พนักงานประจำ',        'Full-time', '#FF5C39', 10,
   '{"attendance":"office","review_cycle":"quarterly","comp":"monthly_salary","benefits":true}'),
  ('probation',    'ทดลองงาน',            'Probation', '#E8A317', 20,
   '{"attendance":"office","review_cycle":"probation","comp":"monthly_salary","benefits":false}'),
  ('part_time',    'พาร์ทไทม์',           'Part-time', '#6C5CE7', 30,
   '{"attendance":"shift","review_cycle":"monthly","comp":"hourly","benefits":false}'),
  ('hybrid',       'ไฮบริด',              'Hybrid', '#1FA672', 40,
   '{"attendance":"hybrid","review_cycle":"quarterly","comp":"monthly_salary","benefits":true}'),
  ('intern',       'เด็กฝึกงาน',          'Intern', '#6C5CE7', 50,
   '{"attendance":"intern","review_cycle":"intern","comp":"stipend","benefits":false}'),
  ('freelance',    'ฟรีแลนซ์',            'Freelance', '#7A736A', 60,
   '{"attendance":"no_fixed","review_cycle":"project","comp":"project","benefits":false}'),
  ('specialist',   'ผู้เชี่ยวชาญเฉพาะทาง', 'Specialist', '#1C1A17', 70,
   '{"attendance":"no_fixed","review_cycle":"project","comp":"project","benefits":false}'),
  ('project_based','ตามโปรเจกต์',         'Project-based', '#E8A317', 80,
   '{"attendance":"project","review_cycle":"project","comp":"project","benefits":false}'),
  ('alumni',       'ศิษย์เก่า / อดีตทีม',  'Alumni', '#B8B8B8', 90, '{}'),
  ('candidate',    'ผู้สมัคร',            'Candidate', '#B8B8B8', 100, '{}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Leave types
-- ---------------------------------------------------------------------------
insert into public.leave_types (key, name, is_paid, requires_evidence, color, sort_order) values
  ('sick',      'ลาป่วย',            true,  true,  '#E5484D', 10),
  ('personal',  'ลากิจ',             true,  false, '#6C5CE7', 20),
  ('annual',    'ลาพักร้อน',         true,  false, '#1FA672', 30),
  ('unpaid',    'ลาไม่รับค่าจ้าง',    false, false, '#7A736A', 40),
  ('wfh',       'Work from home',    true,  false, '#6C5CE7', 50),
  ('onsite',    'ออกกอง / On-site',  true,  false, '#FF5C39', 60),
  ('event',     'งานอีเวนต์',         true,  false, '#FF5C39', 70),
  ('halfday',   'ลาครึ่งวัน',        true,  false, '#E8A317', 80),
  ('emergency', 'ลาฉุกเฉิน',         true,  true,  '#E5484D', 90),
  ('intern',    'ลาฝึกงาน',          true,  false, '#6C5CE7', 100)
on conflict (key) do nothing;

-- Default quotas for full-time (Thai labor law baseline; HR can adjust)
insert into public.leave_policies (leave_type_id, employment_type_id, annual_quota_days, accrual)
select lt.id, et.id,
  case lt.key when 'sick' then 30 when 'personal' then 3 when 'annual' then 6 else null end,
  'yearly'
from public.leave_types lt
cross join public.employment_types et
where lt.key in ('sick','personal','annual') and et.key = 'full_time'
on conflict (leave_type_id, employment_type_id) do nothing;

-- ---------------------------------------------------------------------------
-- Knowledge categories
-- ---------------------------------------------------------------------------
insert into public.knowledge_categories (name, slug, sort_order) values
  ('เอกสารบริษัท', 'company-documents', 10),
  ('คู่มือพนักงาน', 'handbook', 20),
  ('SOP', 'sop', 30),
  ('Brand Guideline', 'brand', 40),
  ('Proposal Template', 'proposal', 50),
  ('Contract Template', 'contract', 60),
  ('Production Checklist', 'production', 70),
  ('Studio Manual', 'studio', 80),
  ('Client Information', 'client', 90),
  ('Finance / Admin', 'finance-admin', 100)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Handbook pages (draft skeleton — HR fills body & publishes)
-- ---------------------------------------------------------------------------
insert into public.handbook_pages (slug, title, category, must_ack, sort_order, is_published) values
  ('welcome',        'ยินดีต้อนรับสู่ YuenDeaw', 'Culture', false, 10, false),
  ('culture',        'วัฒนธรรม & สไตล์การทำงาน', 'Culture', false, 20, false),
  ('employment-types','รูปแบบการจ้างงาน', 'Employment', false, 30, false),
  ('working-hours',  'เวลาทำงาน', 'Working', true, 40, false),
  ('leave-policy',   'นโยบายการลา', 'Leave', true, 50, false),
  ('remote-hybrid',  'Remote / Hybrid / ออกกอง', 'Working', false, 60, false),
  ('code-of-conduct','จรรยาบรรณ (Code of Conduct)', 'Conduct', true, 70, false),
  ('communication',  'กติกาการสื่อสาร', 'Conduct', false, 80, false),
  ('company-assets', 'การใช้ทรัพย์สินบริษัท', 'Assets', false, 90, false),
  ('studio-use',     'การใช้ Studio / อุปกรณ์', 'Assets', false, 100, false),
  ('client-comm',    'การสื่อสารกับลูกค้า', 'Conduct', false, 110, false),
  ('confidentiality','ความลับ / NDA', 'Conduct', true, 120, false),
  ('ai-usage',       'นโยบายการใช้ AI', 'AI', true, 130, false),
  ('social-media',   'นโยบายโซเชียลมีเดีย', 'Conduct', false, 140, false),
  ('anti-harassment','นโยบายต่อต้านการคุกคาม', 'Conduct', true, 150, false),
  ('rewards-benefits','รางวัล & สวัสดิการ', 'Rewards', false, 160, false),
  ('career-growth',  'การเติบโตในสายงาน', 'Growth', false, 170, false),
  ('disciplinary',   'กระบวนการทางวินัย', 'Conduct', false, 180, false),
  ('grievance',      'ช่องทางร้องเรียน', 'Conduct', false, 190, false),
  ('pdpa',           'PDPA / ข้อมูลส่วนบุคคล', 'PDPA', true, 200, false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Application forms (public intake)
-- ---------------------------------------------------------------------------
insert into public.application_forms (slug, kind, title, description, fields) values
  ('job', 'job', 'สมัครงานกับ YuenDeaw',
   'ร่วมเป็นส่วนหนึ่งของทีม creative รุ่นใหม่',
   '[{"key":"experience","label":"ประสบการณ์","type":"textarea"},
     {"key":"skills","label":"ทักษะ / โปรแกรมที่ใช้","type":"text"},
     {"key":"why","label":"ทำไมถึงอยากร่วมงานกับ YuenDeaw","type":"textarea"}]'::jsonb),
  ('internship', 'internship', 'สมัครฝึกงานกับ YuenDeaw',
   'เริ่มต้นเส้นทางสายครีเอทีฟ คอนเทนต์ และโปรดักชัน',
   '[{"key":"university","label":"มหาวิทยาลัย","type":"text"},
     {"key":"faculty","label":"คณะ / สาขา","type":"text"},
     {"key":"year","label":"ชั้นปี","type":"text"},
     {"key":"period","label":"ช่วงฝึกงาน","type":"text"},
     {"key":"learn","label":"อยากเรียนรู้อะไร","type":"textarea"},
     {"key":"tools","label":"เครื่องมือ / ซอฟต์แวร์ที่ใช้ได้","type":"text"}]'::jsonb)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Career tracks (Phase 2 UI; seeded so structure exists)
-- ---------------------------------------------------------------------------
insert into public.career_tracks (name, sort_order) values
  ('Intern Track', 10), ('Production Track', 20), ('Content Track', 30),
  ('Studio / Operation Track', 40), ('Creative / Comedy Track', 50),
  ('AI / Knowledge Track', 60), ('Sales / Sponsor Track', 70)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Benefits catalog
-- ---------------------------------------------------------------------------
insert into public.benefits (key, name, category) values
  ('salary_increase','ปรับเงินเดือน','bonus'),
  ('performance_bonus','โบนัสผลงาน','bonus'),
  ('spot_bonus','Spot Bonus','bonus'),
  ('project_bonus','โบนัสโปรเจกต์','bonus'),
  ('travel_bonus','Travel Bonus','travel'),
  ('learning_budget','งบเรียนรู้','learning'),
  ('health_benefit','สวัสดิการสุขภาพ','health'),
  ('equipment_allowance','ค่าอุปกรณ์','allowance'),
  ('meal_transport','ค่าอาหาร / เดินทาง','allowance'),
  ('special_welfare','สวัสดิการพิเศษ','welfare')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- AI Workplace agents (Phase 3 UI; access controls who sees them)
-- ---------------------------------------------------------------------------
insert into public.ai_agents (key, name, description, access, sort_order) values
  ('hr_assistant','HR Assistant','ผู้ช่วยงาน HR','{"roles":["hr_admin","owner"]}',10),
  ('handbook_assistant','Employee Handbook Assistant','ถาม-ตอบคู่มือพนักงาน','{}',20),
  ('production_assistant','Production Assistant','ผู้ช่วยงานโปรดักชัน','{}',30),
  ('script_comment','Script Comment Assistant','คอมเมนต์สคริปต์','{}',40),
  ('proposal_assistant','Proposal Assistant','ช่วยร่าง proposal','{}',50),
  ('social_caption','Social Caption Assistant','เขียนแคปชัน','{}',60),
  ('sales_proposal','Sales Proposal Assistant','เฉพาะเจ้าของ','{"owner_only":true}',70),
  ('studio_booking','Studio Booking Assistant','จองสตูดิโอ','{}',80),
  ('finance_reminder','Finance Reminder Assistant','เตือนเรื่องการเงิน','{"roles":["finance","owner"]}',90),
  ('intern_mentor','Intern Mentor Assistant','พี่เลี้ยงเด็กฝึกงาน','{"employment_types":["intern"]}',100),
  ('meeting_summary','Meeting Summary Assistant','สรุปประชุม','{}',110),
  ('project_checklist','Project Checklist Assistant','เช็กลิสต์โปรเจกต์','{}',120)
on conflict (key) do nothing;


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
