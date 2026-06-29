-- ===========================================================================
-- คลังรหัสผ่านส่วนตัวของเจ้าของ — เก็บรหัสแบบ "เข้ารหัส AES-256-GCM" เท่านั้น
-- กุญแจอยู่ใน env (CREDENTIAL_ENC_KEY) ไม่ได้อยู่ใน DB → DB หลุดอย่างเดียวอ่านไม่ได้
-- ตารางนี้ "ไม่มี RLS policy" → เข้าถึงได้เฉพาะผ่าน API (service role) ที่เช็ค owner
-- ============================================================================
create table if not exists public.owner_credentials (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  label         text not null,           -- ชื่อบัญชี เช่น "Gmail แก๊ป"
  username      text,                     -- อีเมล/ยูสเซอร์
  url           text,
  category      text,
  secret_cipher text not null,           -- รหัสผ่าน (เข้ารหัสแล้ว — base64 ของ iv+tag+ciphertext)
  note          text,
  rotated_at    date,                     -- วันอัปเดต/เปลี่ยนรหัสล่าสุด (ระบุเองได้)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_owner_cred on public.owner_credentials(owner_user_id);
alter table public.owner_credentials enable row level security;
-- ตั้งใจไม่สร้าง policy: ปิดทุกการเข้าถึงจาก client; ใช้ได้แค่ service role ผ่าน API
