-- รูปถ่าย/รูปโปรไฟล์ผู้สมัคร (โชว์ในการ์ด HR/Owner + อีเมลถึงทีม)
alter table public.applications add column if not exists photo_url text;

-- bucket สาธารณะสำหรับรูปผู้สมัคร (อีเมลต้องดึงรูปจาก URL จริงได้)
insert into storage.buckets (id, name, public)
  values ('applicant-photos', 'applicant-photos', true)
  on conflict (id) do nothing;
