-- ============================================================================
-- YuenDeaw People OS — 0010 reward unit
-- รางวัล/สวัสดิการมีหลายหน่วย: บาท (เงิน), percent (ปรับเงินเดือน %), days (ลาพักร้อน)
-- ============================================================================

alter table public.bonus_requests
  add column if not exists unit text default 'baht'; -- baht | percent | days
