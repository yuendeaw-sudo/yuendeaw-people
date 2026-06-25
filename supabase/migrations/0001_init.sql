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
