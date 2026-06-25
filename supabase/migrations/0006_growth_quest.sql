-- ============================================================================
-- YuenDeaw People OS — 0006 Growth Quest (ภารกิจเติบโต)
-- Gamified goals: employee sets a quest → owner approves (can adjust goal/reward)
-- → mutual agreement → in progress → submit evidence → owner closes →
-- badge + reward + performance points. Feeds year-end performance.
-- ============================================================================

-- Badge catalog
create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  category    text,                -- learning|business|content|project|culture
  tier        text not null default 'bronze',  -- bronze|silver|gold|legendary
  description text,
  icon        text default 'Award',
  sort_order  int not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Quests
create table if not exists public.quests (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        uuid not null references public.employees(id) on delete cascade,
  type               text not null,            -- learning|business|content|project|culture
  title              text not null,
  target             text,                     -- measurable goal
  why_important      text,
  action_plan        text,
  start_date         date,
  end_date           date,
  evidence_plan      text,
  requested_badge    text,
  requested_reward   jsonb not null default '{}'::jsonb,  -- {kind, detail, cash}
  allow_owner_adjust boolean not null default true,
  status             text not null default 'draft',
  -- owner scoring at approval (gatekeeping against easy quests)
  difficulty         int,                      -- 1-4
  business_impact    int,                      -- 1-4
  evidence_quality   int,                      -- 1-3
  base_points        numeric,
  -- progress
  progress_percent   int not null default 0,
  latest_metric      text,
  -- completion
  completion_rate    text,                     -- under|met|exceeded|impact
  performance_points numeric,
  awarded_badge_id   uuid references public.badges(id) on delete set null,
  awarded_badge_name text,
  awarded_tier       text,
  awarded_reward     jsonb not null default '{}'::jsonb,
  reward_status      text not null default 'none', -- none|pending|approved|paid
  owner_note         text,
  employee_confirmed boolean not null default false,
  reviewed_by        uuid references public.app_users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_quests_employee on public.quests(employee_id);
create index if not exists idx_quests_status on public.quests(status);
create trigger trg_quests_updated before update on public.quests
  for each row execute function public.set_updated_at();

-- Progress log
create table if not exists public.quest_updates (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests(id) on delete cascade,
  percent    int,
  metric     text,
  note       text,
  evidence_url text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_quest_updates_quest on public.quest_updates(quest_id);

-- Earned badges
create table if not exists public.employee_badges (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  badge_id    uuid references public.badges(id) on delete set null,
  badge_name  text,
  tier        text,
  quest_id    uuid references public.quests(id) on delete set null,
  points      numeric,
  awarded_at  timestamptz not null default now()
);
create index if not exists idx_emp_badges_employee on public.employee_badges(employee_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.badges enable row level security;
alter table public.quests enable row level security;
alter table public.quest_updates enable row level security;
alter table public.employee_badges enable row level security;

drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select to authenticated using (true);
drop policy if exists badges_write on public.badges;
create policy badges_write on public.badges for all to authenticated
  using (public.auth_has_perm('growth','edit') or public.auth_is_owner())
  with check (public.auth_has_perm('growth','edit') or public.auth_is_owner());

drop policy if exists quests_read on public.quests;
create policy quests_read on public.quests for select to authenticated
  using (
    employee_id = public.current_employee_id()
    or public.is_manager_of(employee_id)
    or public.auth_has_perm('growth','view')
    or public.auth_is_owner()
  );
drop policy if exists quests_insert on public.quests;
create policy quests_insert on public.quests for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.auth_has_perm('growth','create'));
drop policy if exists quests_update on public.quests;
create policy quests_update on public.quests for update to authenticated
  using (
    employee_id = public.current_employee_id()
    or public.auth_has_perm('growth','approve')
    or public.auth_has_perm('growth','edit')
    or public.auth_is_owner()
  )
  with check (true);
drop policy if exists quests_delete on public.quests;
create policy quests_delete on public.quests for delete to authenticated
  using (employee_id = public.current_employee_id() or public.auth_is_owner());

drop policy if exists quest_updates_read on public.quest_updates;
create policy quest_updates_read on public.quest_updates for select to authenticated
  using (exists (
    select 1 from public.quests q where q.id = quest_id and (
      q.employee_id = public.current_employee_id()
      or public.is_manager_of(q.employee_id)
      or public.auth_has_perm('growth','view')
      or public.auth_is_owner()
    )
  ));
drop policy if exists quest_updates_insert on public.quest_updates;
create policy quest_updates_insert on public.quest_updates for insert to authenticated
  with check (exists (
    select 1 from public.quests q where q.id = quest_id and (
      q.employee_id = public.current_employee_id() or public.auth_has_perm('growth','edit') or public.auth_is_owner()
    )
  ));

drop policy if exists emp_badges_read on public.employee_badges;
create policy emp_badges_read on public.employee_badges for select to authenticated
  using (employee_id = public.current_employee_id() or public.auth_has_perm('growth','view') or public.auth_is_owner());
drop policy if exists emp_badges_write on public.employee_badges;
create policy emp_badges_write on public.employee_badges for all to authenticated
  using (public.auth_has_perm('growth','approve') or public.auth_is_owner())
  with check (public.auth_has_perm('growth','approve') or public.auth_is_owner());

-- ---------------------------------------------------------------------------
-- Seed badge catalog
-- ---------------------------------------------------------------------------
insert into public.badges (key, name, category, tier, description, icon, sort_order) values
  ('ai_starter','AI Starter','learning','bronze','เริ่มเรียนรู้การใช้ AI','Sparkles',10),
  ('editor_up','Editor Up','learning','silver','พัฒนาสกิลตัดต่อ','Scissors',20),
  ('pitch_ready','Pitch Ready','learning','silver','พร้อม pitch งาน','Presentation',30),
  ('producer_brain','Producer Brain','learning','gold','คิดแบบโปรดิวเซอร์','BrainCircuit',40),
  ('client_hunter_b','Client Hunter','business','bronze','หาลูกค้าใหม่ได้ 1 ราย','Crosshair',50),
  ('client_hunter_s','Client Hunter','business','silver','หาลูกค้าใหม่ 3 รายในเดือนเดียว','Crosshair',51),
  ('client_hunter_g','Client Hunter','business','gold','หาลูกค้าใหม่ 5 ราย / รายได้เกิน 300k','Crosshair',52),
  ('deal_maker','Deal Maker','business','gold','ปิดดีลสำคัญ','Handshake',60),
  ('sponsor_closer','Sponsor Closer','business','gold','ปิดสปอนเซอร์','Trophy',70),
  ('revenue_builder','Revenue Builder','business','legendary','สร้างรายได้ก้อนใหญ่ให้บริษัท','TrendingUp',80),
  ('viral_maker','Viral Maker','content','gold','ทำคอนเทนต์ไวรัล','Flame',90),
  ('audience_builder','Audience Builder','content','silver','เพิ่มผู้ติดตาม','Users',100),
  ('format_creator','Format Creator','content','gold','สร้าง format ใหม่','Wand2',110),
  ('thirty_m_club','30M Club','content','legendary','ยอดวิวรวมเกิน 30M','Eye',120),
  ('project_owner','Project Owner','project','silver','เป็นเจ้าของโปรเจกต์','FolderKanban',130),
  ('launch_master','Launch Master','project','gold','เปิดตัวสำเร็จ','Rocket',140),
  ('system_builder','System Builder','project','gold','สร้างระบบให้ทีม','Wrench',150),
  ('event_runner','Event Runner','project','silver','จัดอีเวนต์','PartyPopper',160),
  ('team_helper','Team Helper','culture','bronze','ช่วยเหลือทีม','HeartHandshake',170),
  ('mentor','Mentor','culture','gold','เป็นพี่เลี้ยงให้คนอื่น','GraduationCap',180),
  ('problem_solver','Problem Solver','culture','silver','แก้ปัญหาหน้างานใหญ่','Lightbulb',190),
  ('culture_keeper','Culture Keeper','culture','gold','รักษาวัฒนธรรมทีม','Shield',200)
on conflict (key) do nothing;
