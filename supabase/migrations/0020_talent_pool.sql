-- ===========================================================================
-- Creative Talent Pool — ขยาย applications ให้เก็บโปรไฟล์/ผลงาน/คลิป/คะแนน HR/Owner
-- (ต่อยอดจากตารางเดิม — anon insert RLS มีอยู่แล้ว)
-- ============================================================================

-- ข้อมูลพื้นฐานเพิ่มเติม
alter table public.applications add column if not exists applicant_type   text;   -- full_time | internship
alter table public.applications add column if not exists age              int;
alter table public.applications add column if not exists line_id          text;
alter table public.applications add column if not exists location         text;
alter table public.applications add column if not exists current_status   text;   -- student|full_time_employee|freelance|unemployed|other
alter table public.applications add column if not exists interested_roles jsonb not null default '[]'::jsonb;

-- ผลงาน / โซเชียล / คลิป
alter table public.applications add column if not exists resume_url       text;
alter table public.applications add column if not exists portfolio_links  jsonb not null default '[]'::jsonb;
alter table public.applications add column if not exists social_links     jsonb not null default '{}'::jsonb;
alter table public.applications add column if not exists proud_works      jsonb not null default '[]'::jsonb; -- [{title, why}]
alter table public.applications add column if not exists intro_video_url  text;

-- คำถามครีเอทีฟ / ทัศนคติ
alter table public.applications add column if not exists creative_answers jsonb not null default '{}'::jsonb; -- {q1,q2,q3}
alter table public.applications add column if not exists attitude_answers jsonb not null default '{}'::jsonb;

-- HR screening
alter table public.applications add column if not exists hr_score          jsonb not null default '{}'::jsonb; -- {portfolio_quality, communication, creative_fit, culture_fit, reliability_signal}
alter table public.applications add column if not exists hr_recommendation text;  -- strong_yes|yes|maybe|no
alter table public.applications add column if not exists hr_summary        text;
alter table public.applications add column if not exists strengths         jsonb not null default '[]'::jsonb;
alter table public.applications add column if not exists concerns          jsonb not null default '[]'::jsonb;
alter table public.applications add column if not exists tags              jsonb not null default '[]'::jsonb;
alter table public.applications add column if not exists internal_notes    text;
alter table public.applications add column if not exists score             int;   -- overall (ใช้ filter)

-- Owner review
alter table public.applications add column if not exists owner_decision    text;  -- interview|keep|reject|ask_hr_more|project_candidate
alter table public.applications add column if not exists owner_note        text;

-- Interview (เก็บรวมเป็น jsonb)
alter table public.applications add column if not exists interview         jsonb; -- {type, interviewers[], date, start, end, location, meet_url, calendar_event_id, notes_for_candidate, internal_notes, score, decision}

-- consent (Talent Pool)
alter table public.applications add column if not exists consent_to_store_profile boolean not null default false;

-- reference กลับไปยังโปรไฟล์ที่ convert แล้ว (ไม่ลบใบสมัครเดิม)
alter table public.applications add column if not exists converted_kind    text;  -- employee|intern|freelance

create index if not exists idx_applications_stage on public.applications(stage);
create index if not exists idx_applications_type on public.applications(applicant_type);
