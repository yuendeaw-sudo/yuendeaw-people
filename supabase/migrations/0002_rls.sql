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
