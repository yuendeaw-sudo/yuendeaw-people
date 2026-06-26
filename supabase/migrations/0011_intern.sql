-- ============================================================================
-- YuenDeaw People OS — 0011 internship daily log + stipend + evaluation
-- เด็กฝึกงาน: เขียน log เข้างานทุกวัน → พี่เลี้ยงดู/ประเมิน → ผ่านแล้วเริ่มนับเบี้ย
-- ฝึก ฿200/วัน นับเฉพาะวันที่มี log ตั้งแต่วันผ่านประเมิน
-- ============================================================================

-- ฟิลด์เบี้ยฝึกบน employees
alter table public.employees
  add column if not exists stipend_daily_rate numeric(10,2) default 200,   -- เบี้ยฝึก/วัน
  add column if not exists stipend_start_date date;                        -- เริ่มนับเบี้ย (set ตอนผ่านประเมิน)

-- บันทึกประจำวันของน้องฝึก (1 วัน/1 บันทึก)
create table if not exists public.intern_logs (
  id          uuid primary key default gen_random_uuid(),
  intern_id   uuid not null references public.employees(id) on delete cascade,
  log_date    date not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  unique (intern_id, log_date)
);
create index if not exists idx_intern_logs_intern on public.intern_logs(intern_id, log_date desc);

-- การประเมินน้องฝึก
create table if not exists public.intern_evaluations (
  id           uuid primary key default gen_random_uuid(),
  intern_id    uuid not null references public.employees(id) on delete cascade,
  evaluator_id uuid references public.employees(id) on delete set null,
  due_date     date,
  status       text not null default 'pending',   -- pending | passed | failed
  score        int,                                -- 1–5 (ทางเลือก)
  comment      text,
  evaluated_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_intern_eval_intern on public.intern_evaluations(intern_id);

-- ---------------------------------------------------------------------------
-- RLS: น้องฝึกเห็น/เขียนของตัวเอง · พี่เลี้ยง(หัวหน้า)+คนมีสิทธิ์ people เห็นได้
-- การเขียน/ประเมินจาก mentor ทำผ่าน API (admin client) — policy นี้คุมการอ่าน + self-write
-- ---------------------------------------------------------------------------
alter table public.intern_logs enable row level security;
alter table public.intern_evaluations enable row level security;

drop policy if exists intern_logs_sel on public.intern_logs;
create policy intern_logs_sel on public.intern_logs for select using (
  public.auth_is_owner()
  or public.auth_has_perm('people','view')
  or public.is_manager_of(intern_id)
  or intern_id = public.current_employee_id()
);

drop policy if exists intern_logs_ins on public.intern_logs;
create policy intern_logs_ins on public.intern_logs for insert
  with check (intern_id = public.current_employee_id());

drop policy if exists intern_logs_upd on public.intern_logs;
create policy intern_logs_upd on public.intern_logs for update
  using (intern_id = public.current_employee_id())
  with check (intern_id = public.current_employee_id());

drop policy if exists intern_eval_sel on public.intern_evaluations;
create policy intern_eval_sel on public.intern_evaluations for select using (
  public.auth_is_owner()
  or public.auth_has_perm('people','view')
  or public.is_manager_of(intern_id)
  or intern_id = public.current_employee_id()
);
