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
   'เริ่มต้นเส้นทางสายครีเอทีฟ คอนเทนต์ และโปรดักชัน — กรอกสบาย ๆ ใช้เวลาแค่ไม่กี่นาที ✨',
   '[{"key":"university","label":"ชื่อสถานศึกษา","type":"text","section":"study"},
     {"key":"faculty","label":"คณะ / สาขาวิชา","type":"text","section":"study"},
     {"key":"position","label":"ตำแหน่งที่อยากฝึกงาน","type":"text","section":"goal"},
     {"key":"why_position","label":"ทำไมถึงอยากฝึกตำแหน่งนี้","type":"textarea","section":"goal"},
     {"key":"yuendeaw_thought","label":"พอพูดถึง \"ยืนเดี่ยว\" นึกถึงอะไร","type":"textarea","section":"vibe","help":"ตอบแบบไหนก็ได้ ไม่มีผิดถูก 🎤"},
     {"key":"fav_youtube","label":"3 ช่อง YouTube ที่ชอบที่สุด","type":"textarea","section":"vibe","help":"ไม่ต้องเป็นยืนเดี่ยวก็ได้นะ"},
     {"key":"fav_tiktok","label":"3 ช่อง TikTok ที่ชอบที่สุด","type":"textarea","section":"vibe","help":"อยากรู้ว่าคุณเสพคอนเทนต์แบบไหน"},
     {"key":"start_date","label":"เริ่มฝึกได้วันไหน","type":"date","section":"time"},
     {"key":"end_date","label":"ฝึกถึงวันไหน","type":"date","section":"time"},
     {"key":"portfolio_url","label":"Portfolio (วางลิงก์)","type":"url","section":"show"},
     {"key":"resume_url","label":"Resume (วางลิงก์)","type":"url","section":"show"},
     {"key":"intro_video_url","label":"วิดีโอแนะนำตัว (วางลิงก์)","type":"url","section":"show","help":"ทำให้เรารู้จักคุณมากขึ้น 🎥 (ไม่บังคับ แต่ช่วยได้เยอะ)"}]'::jsonb)
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
