# คู่มือตั้ง Google OAuth — รวมศูนย์ที่ People OS (ครอบคลุม ai.yuendeaw ด้วย)

> **สถาปัตยกรรม:** **people.yuendeaw.com = ศูนย์กลางตัวตนพนักงาน (employee directory / source of truth)**
> ส่วน **ai.yuendeaw.com = ระบบหนึ่งที่อยู่ภายใต้พนักงานชุดเดียวกัน**
> ทั้งสองแอป login ด้วย **Google OAuth client ตัวเดียวกัน** → พนักงานใช้อีเมลเดียวเข้าได้ทั้งคู่
> พนักงานใช้ **Gmail ส่วนตัว** → consent screen เป็น **External** + กันคนนอกด้วย **allowlist**

## แผนผังระบบ

| แอป | โดเมน | Supabase project | Callback URL (สำหรับ Google) |
|--|--|--|--|
| **People OS** (ศูนย์กลาง) | people.yuendeaw.com | `bhvbkqcporxbfobehvns` | `https://bhvbkqcporxbfobehvns.supabase.co/auth/v1/callback` |
| **AI Workspace** | ai.yuendeaw.com | `qbkrsexjksmjnrevtrnn` | `https://qbkrsexjksmjnrevtrnn.supabase.co/auth/v1/callback` |

> สร้าง OAuth client **1 ตัว** แล้วใส่ callback URL **ทั้งสองอัน** ในตัวเดียวกัน

---

## 🔢 ก่อนเริ่ม: รัน migration ใน People OS (ถ้ายังไม่ได้ทำ)
Supabase (project `bhvbkqcporxbfobehvns`) → SQL Editor → รันทีละไฟล์:
- `supabase/migrations/0007_auto_link_accounts.sql` — ผูกบัญชี↔พนักงานด้วยอีเมล
- `supabase/migrations/0008_invite.sql` — ปุ่มส่งคำเชิญ
- `supabase/migrations/0009_payroll_fields.sql` — ประกันสังคม/หัก ณ ที่จ่าย

---

# ส่วนที่ 1 — Google Cloud: สร้าง OAuth client (ทำครั้งเดียว)

ทำในบัญชี **gap@standnextstage.com** (org `standnextstage.com`) เพราะเป็นตัวตนบริษัท
ใช้ project **"yuendeaw internal team"** (หรือสร้าง project ใหม่ชื่อ "YuenDeaw Identity" ก็ได้)

> 💡 Google Sign-in **ฟรี ไม่คิดเงิน** ไม่ต้องเปิด billing สำหรับขั้นตอนนี้

### Step 1 — เลือกบัญชี + project ให้ถูก
1. เข้า **console.cloud.google.com** ด้วย **gap@standnextstage.com**
2. แถบบนสุด เลือก org **standnextstage.com** → project **yuendeaw internal team**

### Step 2 — OAuth consent screen
1. เมนู **APIs & Services → OAuth consent screen**
2. **User type: External** → Create
3. กรอก:
   - **App name:** `ยืนเดี่ยว` (หรือ `YuenDeaw`)
   - **User support email:** gap@standnextstage.com
   - **App logo:** (จะใส่โลโก้ ยืนเดี่ยว ก็ได้ — optional)
   - **Developer contact:** gap@standnextstage.com
4. **Scopes:** Add → เลือกแค่ `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (เป็น non-sensitive — **ไม่ต้องผ่าน Google verification**)
5. **Publishing status:** กด **Publish app → Production**
   - basic scopes (email/profile) เปิด Production ได้เลย ไม่ต้องรอ verify
   - *(ทางเลือก: ถ้าอยากค่อยเป็นค่อยไป ปล่อยเป็น "Testing" ก่อน แล้วใส่อีเมลพนักงานใน Test users — แต่จำกัด 100 คน; แนะนำ Publish ไปเลยง่ายกว่า)*

### Step 3 — สร้าง OAuth client ID
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. **Application type: Web application**
3. **Name:** `YuenDeaw SSO`
4. **Authorized redirect URIs** → Add URI ทั้ง **2 อัน**:
   ```
   https://bhvbkqcporxbfobehvns.supabase.co/auth/v1/callback
   https://qbkrsexjksmjnrevtrnn.supabase.co/auth/v1/callback
   ```
5. กด **Create** → คัดลอก **Client ID** และ **Client secret** เก็บไว้ (ใช้ทั้งสองแอป)

---

# ส่วนที่ 2 — Supabase People OS (เปิดใช้ได้เลยตอนนี้)

Project `bhvbkqcporxbfobehvns`:

### 2.1 เปิด Google provider
**Authentication → Sign In / Providers → Google** → Enable
- วาง **Client ID** + **Client Secret** (จาก Step 3) → **Save**

### 2.2 ตั้ง URL
**Authentication → URL Configuration**
- **Site URL:** `https://people.yuendeaw.com`
- **Redirect URLs** (Add ทีละอัน):
  ```
  https://people.yuendeaw.com/auth/callback
  http://localhost:3200/auth/callback
  ```

✅ เสร็จส่วนนี้ — People OS กด "เข้าสู่ระบบด้วย Google" ได้แล้ว

---

# ส่วนที่ 3 — Supabase AI Workspace (ทำตอนนี้ หรือรอตอนเปิด ai ก็ได้)

Project `qbkrsexjksmjnrevtrnn` — ใช้ **client ID/secret ตัวเดียวกัน**:

### 3.1 เปิด Google provider
**Authentication → Providers → Google** → Enable → วาง Client ID + Secret **ตัวเดิม** → Save

### 3.2 ตั้ง URL
- **Site URL:** `https://ai.yuendeaw.com`
- **Redirect URLs:**
  ```
  https://ai.yuendeaw.com/auth/callback
  http://localhost:3000/auth/callback
  ```

> เพราะ client เดียวกันมี callback ของ ai อยู่แล้ว (Step 3) — แค่เปิด provider ใน project นี้ก็ใช้ได้

> ⚠️ **ข้อควรรู้เรื่อง ai + Gmail ส่วนตัว:** ตอนนี้ ai กันคนเข้าด้วย **โดเมนบริษัท** (`yuendeaw.com`, `standnextstage.com`) หรือ invite link
> → **พนักงานที่ใช้ Gmail ส่วนตัวจะยังเข้า ai ไม่ได้** จนกว่าจะปรับ ai ให้เช็คทะเบียนพนักงานจาก People OS (ดูส่วนที่ 5)
> → ดังนั้น **เปิด People OS ก่อนได้เลย**, ส่วน ai ค่อยทำตอนพร้อม

---

# ส่วนที่ 4 — ทดสอบ (People OS)

1. เข้า People OS → **บุคคลากร → เพิ่มพนักงาน** ใส่ **อีเมล Gmail** ของพนักงาน + role + ทีม
2. เปิดการ์ดพนักงาน → กด **ส่งคำเชิญ**
3. พนักงานเข้า **people.yuendeaw.com** → **เข้าสู่ระบบด้วย Google** ด้วย Gmail เดียวกัน
4. ระบบผูกบัญชีอัตโนมัติ (migration 0007) → เห็นโปรไฟล์/ลา/Growth Quest ของตัวเอง
   - ถ้าอีเมลไม่ตรงพนักงานคนไหน → เด้งหน้า "รอการเชิญ" (allowlist ทำงาน)

---

# ส่วนที่ 5 — ทิศทางอนาคต: People OS เป็น directory กลาง

เป้าหมาย: **ai (และระบบอื่น ๆ) เช็ค "ใครเป็นพนักงาน" จาก People OS** แทนที่จะมี allowlist แยกของตัวเอง

แนวทางที่ทำได้ (เลือกทำทีหลังเมื่อ People OS เสถียร):
- **API กลางจาก People OS:** ทำ endpoint เช่น `GET /api/directory/is-employee?email=` (ป้องกันด้วย service token) ให้ ai เรียกเช็คตอน login
- **ตารางพนักงานแชร์:** ให้ ai อ่านรายชื่ออีเมลพนักงานจาก People OS (อ่านอย่างเดียว) มาเทียบ allowlist
- เมื่อทำแล้ว: แก้ ai callback ให้เปลี่ยนจากเช็ค `ALLOWED_DOMAINS` → เช็ค "เป็นพนักงานใน People OS ไหม" รองรับ Gmail ส่วนตัวได้

> **ยังไม่ต้อง merge ฐานข้อมูล 2 project** — schema ชนกันหนัก (teams/documents/handle_new_user) คงไว้ 2 project, เชื่อมผ่าน directory/API ปลอดภัยกว่า

---

## สรุป checklist
- [ ] รัน migration 0007/0008/0009 (People OS)
- [ ] Google Cloud: consent screen External (Publish) + OAuth client พร้อม redirect **2 อัน**
- [ ] Supabase People OS: เปิด Google provider + ตั้ง redirect URLs → **เปิดใช้ได้เลย**
- [ ] (ทีหลัง) Supabase AI: เปิด provider ด้วย client เดียวกัน
- [ ] (ทีหลัง) ทำ directory API ให้ ai เช็คพนักงานจาก People OS
