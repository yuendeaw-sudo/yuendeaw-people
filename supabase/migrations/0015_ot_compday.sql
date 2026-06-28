-- ===========================================================================
-- OT (ทำงานล่วงเวลา) — เบิกเป็นเรตเหมา 600 บาท/ครั้ง, หัวหน้า/ผู้มีสิทธิ์อนุมัติลาเป็นคนอนุมัติ
-- ============================================================================
create table if not exists public.ot_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  work_date     date not null,
  ot_type       text not null,                 -- scope_studio | weekend_shoot
  amount        numeric(8,2) not null default 600,  -- snapshot จากเรตของพนักงาน (employees.ot_rate)
  hours         numeric(4,1),                  -- จำนวนชั่วโมงที่ทำ (พนักงานกรอก)
  reason        text,
  status        text not null default 'pending',  -- pending | approved | rejected
  decided_by    uuid references public.app_users(id),
  decided_at    timestamptz,
  reviewer_comment text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ot_emp on public.ot_requests(employee_id, work_date);
create index if not exists idx_ot_status on public.ot_requests(status);
alter table public.ot_requests enable row level security;
-- เข้าถึงผ่าน API (service role) เท่านั้น → ไม่ต้องมี policy

-- ===========================================================================
-- วันหยุดสะสมจากการทุ่มเท (change day off) — owner ให้ด้วยดุลยพินิจ
-- ============================================================================
create table if not exists public.comp_day_off (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  work_date     date,                          -- วันที่มาทำงานจนได้สิทธิ์นี้
  days          numeric(4,1) not null default 1,
  hours         numeric(4,1),                  -- ชั่วโมงที่ทำ (อ้างอิงดุลยพินิจ owner)
  note          text,
  granted_by    uuid references public.app_users(id),
  created_at    timestamptz not null default now()
);
create index if not exists idx_compday_emp on public.comp_day_off(employee_id);
alter table public.comp_day_off enable row level security;
