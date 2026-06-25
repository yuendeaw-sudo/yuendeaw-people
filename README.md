# YuenDeaw People OS — people.yuendeaw.com

A modern **People OS** for YuenDeaw — บริหารพนักงาน เด็กฝึกงาน freelance และการเติบโตของคนรุ่นใหม่
ในอุตสาหกรรม creative / content / production / comedy / AI

Stack: **Next.js 15 (App Router) · React 19 · Supabase · Tailwind · TypeScript** → deploy บน Vercel

---

## 🚀 เริ่มต้นใช้งาน

### 1. สร้าง Supabase project ใหม่
สร้าง project ใหม่ชื่อ `yuendeaw people` (แยกจาก standnextstage) ที่ https://supabase.com

### 2. รัน migration
เปิด **SQL Editor** ใน Supabase แล้วรันไฟล์ตามลำดับ:
```
supabase/migrations/0001_init.sql        # ตาราง + helper + index (ทุก Phase)
supabase/migrations/0002_rls.sql         # RLS policies + permission functions
supabase/migrations/0003_seed.sql        # roles, permissions, employment types, leave types, handbook, forms
supabase/migrations/0004_auth_hooks.sql  # auto-provision app_users + bootstrap owner
```
> ผู้ใช้ที่สมัครด้วยอีเมล `gap@standnextstage.com` จะถูกตั้งเป็น **owner** อัตโนมัติ

### 3. ตั้งค่า env
```bash
cp .env.local.example .env.local
```
ใส่ค่าจาก Supabase → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — ห้าม expose)

### 4. รัน dev
```bash
npm install
npm run dev      # http://localhost:3000  (หรือ --port 3200)
```

### 5. เข้าใช้งานครั้งแรก
1. เปิด `/login` → สร้างบัญชีด้วยอีเมล owner (`gap@standnextstage.com`)
2. ยืนยันอีเมล (หรือปิด email confirmation ใน Supabase → Auth → Providers ระหว่างพัฒนา)
3. เข้าระบบ → เห็นเมนูครบทุก module (owner เห็นทุกอย่าง)
4. ผูกบัญชี owner กับข้อมูลพนักงาน: เพิ่มแถวใน `employees` ที่ `user_id` = id ของ owner เพื่อให้ profile/leave ทำงาน

---

## 🧱 สถาปัตยกรรม

### Permission model (ยืดหยุ่น ไม่ hard-code)
- `roles` × `permissions` (module × action) → `role_permissions`
- ผูกคนผ่าน `employee_roles` + override รายคนที่ `permission_overrides`
- Actions: `view · create · edit · delete · approve · export · sensitive_view`
- บังคับใช้ผ่าน **RLS** (`auth_has_perm()`, `current_employee_id()`, `is_manager_of()`)
  เสริมด้วยการเช็คในแอป (`lib/permissions.ts`, `lib/auth.ts`)
- Owner (`app_users.is_owner`) ลัดผ่านทุกสิทธิ์

### Policy เป็น data
`employment_types.policy` (JSONB) + `leave_policies` + `employees.policy_override`
→ HR แก้กติกา/โควต้า/สวัสดิการเองได้โดยไม่ต้องแก้โค้ด

### ข้อมูลลับ (sensitive)
เงินเดือน (`employee_compensation`), incident, HR notes → กั้นด้วย `sensitive_view`
และบันทึกการเข้าถึงใน `audit_logs` (เช่น เปิดดูเงินเดือน)

---

## 📍 สถานะ Phase

| Phase | สถานะ | ขอบเขต |
|------|--------|--------|
| **1 (MVP)** | ✅ สร้างแล้ว | Login/RBAC · Profile · People directory · Time & Leave · Handbook · Applications (public form + pipeline) · HR & Owner dashboard · Admin settings |
| **2** | 🗄️ DB พร้อม | Performance · Feedback · KPI · Career path · Promotion · Bonus/Benefits · Incidents |
| **3** | 🗄️ DB พร้อม | AI Workplace · Knowledge Base · Prompt/Agent library |
| **4** | 🗄️ DB พร้อม | Subscriptions · Company assets · Payroll export · Analytics · Notifications |

> ตารางของ Phase 2–4 ถูกออกแบบและสร้างใน schema แล้ว เหลือเฉพาะส่วนหน้าจอ

---

## 🗂️ โครงสร้างหลัก
```
app/
  (app)/            # หน้าจอหลัง login (มี sidebar shell + RBAC)
    dashboard · profile · people · time-leave · handbook
    applications · admin · owner · + placeholder ของ Phase 2–4
  apply/[slug]/     # ฟอร์มสมัครงาน/ฝึกงาน (public)
  login/
lib/
  supabase/         # client · server · admin
  auth.ts           # getAccessContext() + audit()
  permissions.ts    # nav + can()
components/         # AppShell · ui · ฟอร์ม leave/apply/handbook
supabase/migrations # 0001–0004
```
