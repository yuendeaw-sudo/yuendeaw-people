-- ============================================================================
-- YuenDeaw People OS — 0013 job description per employee
-- การ์ด Job Description (accordion) บนหน้าพนักงาน — owner/หัวหน้า/เจ้าตัวแก้ได้
-- owner ส่งต่อให้พนักงานที่มารับช่วงงานได้
-- ============================================================================

alter table public.employees
  add column if not exists job_description text;
