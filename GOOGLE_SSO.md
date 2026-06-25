# ตั้งค่า Google SSO + เปิดให้พนักงานเข้าใช้งาน

ระบบใช้ **invite + allowlist**: HR เพิ่มพนักงาน (ใส่อีเมล Google) → ส่งคำเชิญ → พนักงานกด
"เข้าสู่ระบบด้วย Google" ด้วยอีเมลเดียวกัน → ระบบผูกบัญชีอัตโนมัติ คนที่ไม่ได้อยู่ในระบบจะเข้าไม่ได้
(เด้งไปหน้า "รอการเชิญ")

---

## 1) รัน migration ใน Supabase (SQL Editor) — ครั้งเดียว

รันทั้งสองไฟล์นี้ (วางทีละไฟล์ กด Run):

- `supabase/migrations/0007_auto_link_accounts.sql` — ผูกบัญชี↔พนักงานด้วยอีเมลอัตโนมัติ
- `supabase/migrations/0008_invite.sql` — เพิ่มคอลัมน์ `invited_at` ไว้ติดตามการเชิญ

> ปลอดภัยรันซ้ำได้ (`if not exists` / `create or replace`)

---

## 2) สร้าง Google OAuth Client (Google Cloud Console)

1. ไปที่ **console.cloud.google.com** → สร้าง/เลือกโปรเจกต์
2. **APIs & Services → OAuth consent screen** → เลือก **Internal** (ถ้าใช้ Google Workspace
   ของบริษัท) หรือ **External** → กรอกชื่อแอป "YuenDeaw People OS" + อีเมลติดต่อ
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** ใส่ค่านี้ (เอา project ref จาก Supabase):
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
     > หา `<project-ref>` ได้จาก Supabase → Project Settings → Data API → URL
       (เช่น `https://abcdxyz.supabase.co` → ref คือ `abcdxyz`)
4. กด Create → คัดลอก **Client ID** และ **Client Secret** ไว้

---

## 3) เปิด Google provider ใน Supabase

1. Supabase → **Authentication → Sign In / Providers → Google** → เปิด (Enable)
2. วาง **Client ID** + **Client Secret** จากขั้นที่ 2 → Save

---

## 4) ตั้ง URL ให้ redirect กลับเว็บเราถูก

Supabase → **Authentication → URL Configuration**

- **Site URL:** `https://people.yuendeaw.com`
- **Redirect URLs** (กด Add ทีละอัน):
  ```
  https://people.yuendeaw.com/auth/callback
  http://localhost:3200/auth/callback
  ```

---

## 5) (ทางเลือก) เปิดอีเมลคำเชิญอัตโนมัติด้วย Resend

ถ้าตั้ง env สองตัวนี้ (Vercel → Settings → Environment Variables) ปุ่ม "ส่งคำเชิญ" จะส่งอีเมลให้เอง:

| Key | ค่า |
|---|---|
| `RESEND_API_KEY` | API key จาก resend.com |
| `RESEND_FROM` | เช่น `People OS <people@yuendeaw.com>` (โดเมนต้อง verify ใน Resend) |

ถ้าไม่ตั้ง — ปุ่มยังใช้ได้ แต่จะ **ให้ข้อความเชิญมาคัดลอก** ส่งเองทาง LINE/แชตได้

> ทางเลือก: ตั้ง `NEXT_PUBLIC_SITE_URL=https://people.yuendeaw.com` ด้วย เพื่อให้ลิงก์ในอีเมลถูกเสมอ

---

## ขั้นตอน onboard พนักงาน (หลังตั้งค่าเสร็จ)

1. HR เข้า **บุคคลากร → เพิ่มพนักงาน** ใส่ข้อมูล + **อีเมล Google** ของพนักงาน + กำหนด role
2. เปิดหน้าพนักงานคนนั้น → กดปุ่ม **"ส่งคำเชิญ"** (ส่งอีเมล หรือคัดลอกข้อความไปส่งเอง)
3. พนักงานเข้า **people.yuendeaw.com** → กด **"เข้าสู่ระบบด้วย Google"** → เลือกอีเมลที่ HR คีย์ไว้
4. เข้าได้ทันที เห็นโปรไฟล์/ลา/Growth Quest ของตัวเอง — บัญชีผูกอัตโนมัติแล้ว

หน้าพนักงานจะแสดงสถานะ:
- **ส่งคำเชิญ** — ยังไม่เคยเชิญ
- **ส่งคำเชิญอีกครั้ง** — เชิญแล้ว รอเข้าระบบ
- **✅ เข้าใช้งานแล้ว** — ผูกบัญชีเรียบร้อย

---

## หมายเหตุ

- **เบอร์โทรศัพท์** เก็บในโปรไฟล์พนักงานได้เลย (ยังไม่ verify ด้วย SMS — เปิดทีหลังได้เมื่อพร้อมต่อ
  ผู้ให้บริการ SMS)
- **ความปลอดภัย:** Google SSO เปิดให้ใครก็กดล็อกอินได้ แต่ allowlist กันไว้ — คนที่อีเมลไม่ตรง
  พนักงานในระบบจะเด้งไปหน้า "รอการเชิญ" เข้าข้อมูลอะไรไม่ได้
- ยังคงเข้าด้วย **อีเมล+รหัสผ่าน** ได้ (ปุ่มเล็ก "สำหรับแอดมิน") เผื่อ owner/แอดมิน
