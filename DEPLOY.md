# Deploy → people.yuendeaw.com

Production-ready checklist for the YuenDeaw People OS. Build is green (31 routes, no errors).

---

## 1. Environment variables

ตั้งใน **Vercel → Project → Settings → Environment Variables** (Production).
ค่าจาก Supabase อยู่ที่ **Project Settings → API**.

| Variable | จำเป็น | ค่า / ที่มา |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://bhvbkqcporxbfobehvns.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role secret (อัปโหลดไฟล์/cron/payroll — **อย่า expose**) |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://people.yuendeaw.com` |
| `NEXT_PUBLIC_OWNER_EMAIL` | ✅ | `gap@standnextstage.com` |
| `ANTHROPIC_API_KEY` | ⭕️ | สำหรับ AI Workplace chat (ไม่ใส่ = แชทขึ้น 503) |
| `CRON_SECRET` | ✅* | ยาวสุ่ม — ป้องกัน cron route (Vercel ส่งเป็น Bearer ให้อัตโนมัติ) |
| `RESEND_API_KEY` | ⭕️ | ส่ง email digest (ไม่ใส่ = ใช้แจ้งเตือนในแอปอย่างเดียว) |
| `RESEND_FROM` | ⭕️ | เช่น `People OS <people@yuendeaw.com>` (โดเมนต้อง verify ใน Resend) |

> `*` ถ้าไม่ตั้ง `CRON_SECRET` ระบบจะอนุญาตเฉพาะ owner ที่ล็อกอินกดปุ่ม "ตรวจ & แจ้งเตือน" เอง — production ควรตั้ง
> สร้าง secret: `openssl rand -hex 32`

---

## 2. Push โค้ดขึ้น Git (โปรเจกต์ยังไม่ใช่ repo)

```bash
cd "yuendeaw-people"
git init
git add .
git commit -m "YuenDeaw People OS"
# สร้าง repo ใน GitHub แล้ว:
git remote add origin https://github.com/<you>/yuendeaw-people.git
git branch -M main
git push -u origin main
```
`.env.local` ถูก `.gitignore` ไว้แล้ว — secret ไม่ขึ้น git (ปลอดภัย)

> ทางเลือก: ไม่ใช้ GitHub ก็ deploy ตรงได้ด้วย `npx vercel` (Vercel CLI) จากโฟลเดอร์โปรเจกต์

---

## 3. สร้าง Vercel project

1. vercel.com → **Add New → Project** → import repo
2. Framework: **Next.js** (ตรวจอัตโนมัติ) · Root: `yuendeaw-people` (ถ้า repo เป็นโฟลเดอร์ย่อย)
3. ใส่ Environment Variables จากข้อ 1 → **Deploy**

---

## 4. Custom domain — people.yuendeaw.com

1. Vercel → Project → **Settings → Domains → Add** → `people.yuendeaw.com`
2. ที่ผู้ให้บริการ DNS ของ yuendeaw.com เพิ่ม record ตามที่ Vercel บอก:
   - แบบ subdomain ใช้ **CNAME**: `people` → `cname.vercel-dns.com`
3. รอ DNS propagate (ไม่กี่นาที–ชั่วโมง) → Vercel ออก SSL ให้อัตโนมัติ

---

## 5. Cron (แจ้งเตือนอัตโนมัติ)

- `vercel.json` ตั้งไว้แล้ว: รันทุกวัน **01:00 UTC (08:00 ไทย)** ยิงไป `/api/cron/notifications`
- Vercel จะแนบ `Authorization: Bearer $CRON_SECRET` ให้อัตโนมัติ (ต้องตั้ง `CRON_SECRET`)
- **Hobby plan**: cron รายวันได้ (พอสำหรับงานนี้) · อยากถี่กว่าวันละครั้งต้อง Pro
- ตรวจสอบ: Vercel → Project → **Cron Jobs** จะเห็น job + log

---

## 6. ตั้งค่า Supabase สำหรับ production

**Authentication → URL Configuration**
- **Site URL**: `https://people.yuendeaw.com`
- **Redirect URLs**: เพิ่ม `https://people.yuendeaw.com/**`

**Authentication → Sign In / Providers → Email**
- ถ้าอยากให้สมัครแล้วเข้าได้เลย: ปิด **"Confirm email"**
- ถ้าจะให้ยืนยันอีเมลจริง (แนะนำสำหรับ production): **เปิด** Confirm email + ตั้ง SMTP ของตัวเอง (Auth → Emails → SMTP) ไม่งั้นอีเมลยืนยันจะถูกจำกัด rate ของ Supabase

**Storage** — bucket `leave-evidence` (private) สร้างไว้แล้ว ✅

**Database** — migrations 0001–0006 + ALTER 0005 รันแล้ว ✅

---

## 7. หลัง deploy — เช็กให้ครบ

- [ ] เปิด `https://people.yuendeaw.com/login` → สมัคร/เข้าด้วย owner email
- [ ] Dashboard, บุคคลากร, เวลา & การลา, Growth Quest โหลดได้
- [ ] AI Workplace แชทตอบ (ถ้าตั้ง `ANTHROPIC_API_KEY`)
- [ ] อัปโหลดใบรับรองแพทย์ในการขอลาป่วย → เปิดดูได้
- [ ] Owner Room กด "ตรวจ & แจ้งเตือน" → กระดิ่งเด้ง
- [ ] Payroll → ดาวน์โหลด CSV เปิดใน Excel ภาษาไทยไม่เพี้ยน
- [ ] Vercel Cron Jobs เห็น job รายวัน

---

## หมายเหตุ
- ทุก API route ใช้ `runtime = "nodejs"` (รองรับ Vercel)
- ข้อมูลลับ (เงินเดือน/ปชช./ใบรับรองแพทย์) กั้นด้วย RLS + sensitive_view + private storage
- ถ้าเปลี่ยน owner email ให้แก้ `NEXT_PUBLIC_OWNER_EMAIL` + ฟังก์ชัน `handle_new_user` ใน `0004_auth_hooks.sql`
