"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import {
  INTERESTED_ROLES,
  CURRENT_STATUS_FULL,
  CURRENT_STATUS_INTERN,
  WORK_TYPES_FULL,
  SOCIAL_KEYS,
  questionsFor,
} from "@/lib/applications";

type View = "landing" | "form" | "done";

export default function TalentApplyPage() {
  const [view, setView] = useState<View>("landing");
  const [type, setType] = useState<"full_time" | "internship">("full_time");

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="YuenDeaw" className="h-9 w-9 rounded-lg object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <span className="font-bold">YuenDeaw · Talent Pool</span>
        </div>

        {view === "landing" && <Landing onPick={(t) => { setType(t); setView("form"); }} />}
        {view === "form" && <ApplyForm type={type} onBack={() => setView("landing")} onDone={() => setView("done")} />}
        {view === "done" && <ThankYou />}
      </div>
    </div>
  );
}

function Landing({ onPick }: { onPick: (t: "full_time" | "internship") => void }) {
  return (
    <div className="sm:py-6">
      <h1 className="text-[26px] leading-snug sm:text-[40px] sm:leading-[1.15] font-extrabold tracking-tight text-balance">
        มาร่วมสร้างวัฒนธรรมคอนเทนต์<wbr />
        <span className="whitespace-nowrap">กับยืนเดี่ยว</span>
      </h1>
      <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed max-w-xl">
        เราเปิดรับคนที่อยากทำคอนเทนต์ โชว์ สแตนด์อัพ โปรดักชัน และระบบสร้างศิลปินตลกยุคใหม่
      </p>
      <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed max-w-xl">
        ฝากโปรไฟล์ ผลงาน และคลิปแนะนำตัวไว้กับเราได้เลย เมื่อมีตำแหน่งหรือโปรเจกต์ที่เหมาะ ทีมเราจะติดต่อกลับ
      </p>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <button onClick={() => onPick("full_time")} className="card p-6 text-left hover:shadow-pop hover:border-brand/40 transition">
          <div className="text-3xl">💼</div>
          <div className="font-bold text-lg mt-3">สมัครพนักงานประจำ</div>
          <div className="text-sm text-muted mt-1 leading-relaxed">ร่วมทีมเต็มตัว สร้างคอนเทนต์ / โชว์ / โปรดักชัน</div>
          <div className="text-gold text-sm font-semibold mt-4 flex items-center gap-1">เริ่มสมัคร <Icon name="ArrowRight" className="size-4" /></div>
        </button>
        <button onClick={() => onPick("internship")} className="card p-6 text-left hover:shadow-pop hover:border-brand/40 transition">
          <div className="text-3xl">🌱</div>
          <div className="font-bold text-lg mt-3">สมัครเด็กฝึกงาน</div>
          <div className="text-sm text-muted mt-1 leading-relaxed">มาเรียนรู้งานจริงกับทีมยืนเดี่ยว</div>
          <div className="text-gold text-sm font-semibold mt-4 flex items-center gap-1">เริ่มสมัคร <Icon name="ArrowRight" className="size-4" /></div>
        </button>
      </div>
    </div>
  );
}

function ThankYou() {
  return (
    <div className="card p-8 text-center">
      <div className="text-5xl">💛</div>
      <h2 className="text-2xl font-bold mt-3">เราได้รับใบสมัครของคุณแล้ว</h2>
      <p className="mt-3 text-muted leading-relaxed">
        ทีมยืนเดี่ยวจะเก็บโปรไฟล์นี้ไว้ใน People OS Talent Pool
        <br />
        เมื่อมีตำแหน่งหรือโปรเจกต์ที่เหมาะ เราจะติดต่อกลับ
      </p>
      <p className="mt-4 text-gold font-medium">ขอบคุณที่ส่งตัวตน ผลงาน และความตั้งใจของคุณมาให้เราเห็น</p>
    </div>
  );
}

function ApplyForm({ type, onBack, onDone }: { type: "full_time" | "internship"; onBack: () => void; onDone: () => void }) {
  const [f, setF] = useState<any>({
    full_name: "", nickname: "", age: "", phone: "", email: "", line_id: "", location: "",
    work_type_interest: type === "internship" ? "internship" : "full_time",
    available_start_date: "", expected_compensation: "", current_status: "",
    interested_roles: [] as string[],
    resume_url: "", portfolio_url: "",
    portfolio_links: ["", "", ""],
    social_links: {} as Record<string, string>,
    proud_works: [{ title: "", why: "" }, { title: "", why: "" }, { title: "", why: "" }],
    intro_video_url: "",
    creative_answers: { q1: "", q2: "", q3: "" },
    attitude_answers: { q1: "", q2: "", q3: "" },
    university: "", faculty: "", internship_months: "",
    consent: false,
  });
  const isIntern = type === "internship";
  const Q = questionsFor(type);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  function toggleRole(k: string) {
    set("interested_roles", f.interested_roles.includes(k) ? f.interested_roles.filter((x: string) => x !== k) : [...f.interested_roles, k]);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.full_name.trim() || !f.email.trim()) return setErr("กรอกชื่อ-นามสกุล และอีเมลก่อน");
    if (!f.consent) return setErr("กรุณายินยอมให้เก็บข้อมูลก่อนส่งใบสมัคร");
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        applicant_type: type,
        full_name: f.full_name, nickname: f.nickname, age: f.age, phone: f.phone, email: f.email,
        line_id: f.line_id, location: f.location,
        work_type_interest: isIntern ? "internship" : f.work_type_interest,
        available_start_date: f.available_start_date || null,
        expected_compensation: isIntern ? "" : f.expected_compensation,
        current_status: f.current_status, interested_roles: f.interested_roles,
        resume_url: f.resume_url, portfolio_url: f.portfolio_url,
        social_links: f.social_links,
        intro_video_url: f.intro_video_url,
        creative_answers: f.creative_answers, attitude_answers: isIntern ? {} : f.attitude_answers,
        answers: isIntern ? { university: f.university, faculty: f.faculty, internship_months: f.internship_months } : {},
        consent_to_store_profile: f.consent,
      };
      const r = await fetch("/api/applications/submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) return setErr((await r.text()) || "ส่งไม่สำเร็จ");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1">
        <Icon name="ChevronLeft" className="size-4" /> กลับ
      </button>
      <div>
        <span className="chip bg-brand-soft text-gold">{type === "internship" ? "🌱 สมัครเด็กฝึกงาน" : "💼 สมัครพนักงานประจำ"}</span>
        <h2 className="text-2xl font-bold mt-2">กรอกใบสมัคร</h2>
      </div>

      {/* ข้อมูลพื้นฐาน */}
      <Section title="ข้อมูลพื้นฐาน">
        <div className="grid sm:grid-cols-2 gap-3">
          <T label="ชื่อ-นามสกุล *" v={f.full_name} on={(v) => set("full_name", v)} />
          <T label="ชื่อเล่น" v={f.nickname} on={(v) => set("nickname", v)} />
          <T label="อายุ" type="number" v={f.age} on={(v) => set("age", v)} />
          <T label="เบอร์โทร" v={f.phone} on={(v) => set("phone", v)} />
          <T label="อีเมล *" type="email" v={f.email} on={(v) => set("email", v)} />
          <T label="LINE ID" v={f.line_id} on={(v) => set("line_id", v)} />
          <T label="ที่อยู่ / จังหวัด" v={f.location} on={(v) => set("location", v)} />
          <Sel label="สถานะปัจจุบัน" v={f.current_status} on={(v) => set("current_status", v)} opts={isIntern ? CURRENT_STATUS_INTERN : CURRENT_STATUS_FULL} />
          {!isIntern && (
            <Sel label="รูปแบบงานที่สนใจ" v={f.work_type_interest} on={(v) => set("work_type_interest", v)} opts={WORK_TYPES_FULL} />
          )}
          <T label={isIntern ? "วันที่อยากเริ่มฝึกงาน" : "เริ่มงานได้เมื่อ"} type="date" v={f.available_start_date} on={(v) => set("available_start_date", v)} />
          {!isIntern && (
            <T label="ค่าตอบแทนที่คาดหวัง" v={f.expected_compensation} on={(v) => set("expected_compensation", v)} />
          )}
        </div>
      </Section>

      {/* การศึกษา (เฉพาะเด็กฝึกงาน) */}
      {isIntern && (
        <Section title="ข้อมูลการศึกษา / ฝึกงาน">
          <div className="grid sm:grid-cols-2 gap-3">
            <T label="มหาวิทยาลัย" v={f.university} on={(v) => set("university", v)} />
            <T label="คณะ / สาขา" v={f.faculty} on={(v) => set("faculty", v)} />
            <T label="ระยะเวลาฝึกงาน (เดือน)" type="number" v={f.internship_months} on={(v) => set("internship_months", v)} ph="เช่น 4" />
          </div>
        </Section>
      )}

      {/* สายงานที่สนใจ */}
      <Section title="สายงานที่สนใจ" hint="เลือกได้หลายข้อ">
        <div className="grid sm:grid-cols-2 gap-2">
          {INTERESTED_ROLES.map((r) => {
            const on = f.interested_roles.includes(r.key);
            return (
              <button type="button" key={r.key} onClick={() => toggleRole(r.key)}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${on ? "border-brand bg-brand-soft" : "border-sand hover:bg-sand/40"}`}>
                {on ? "✓ " : ""}{r.emoji} {r.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ผลงาน */}
      <Section title="ผลงาน / Portfolio" hint="ใส่ลิงก์ก่อนได้ (ไฟล์อัปโหลดทีหลัง)">
        <div className="grid sm:grid-cols-2 gap-3">
          <T label="ลิงก์ Resume" v={f.resume_url} on={(v) => set("resume_url", v)} ph="https://..." />
          <T label="ลิงก์ Portfolio หลัก" v={f.portfolio_url} on={(v) => set("portfolio_url", v)} ph="https://..." />
        </div>
        <label className="label mt-3">โซเชียล</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {SOCIAL_KEYS.map((s) => (
            <input key={s.key} className="input" placeholder={s.label} value={f.social_links[s.key] || ""}
              onChange={(e) => set("social_links", { ...f.social_links, [s.key]: e.target.value })} />
          ))}
        </div>
      </Section>

      {/* คลิปแนะนำตัว */}
      <Section title="คลิปแนะนำตัว (แนวตั้ง 2-3 นาที)">
        <div className="rounded-xl bg-sand/40 p-3 text-sm text-muted mb-3 leading-relaxed">
          ถ่ายด้วยมือถือได้ ไม่ต้องโปรดักชันใหญ่ ขอแค่เห็นตัวคุณจริง ๆ — ในคลิปขอให้เล่า 4 เรื่อง:
          <ol className="list-decimal ml-5 mt-1.5 space-y-0.5">
            <li>คุณคือใคร</li>
            <li>ทำไมอยากร่วมงานกับยืนเดี่ยว</li>
            <li>คุณทำอะไรเก่ง หรือกำลังพยายามเก่งเรื่องอะไร</li>
            <li>ถ้าให้สร้างคอนเทนต์ 1 ชิ้นให้ยืนเดี่ยว คุณอยากทำอะไร</li>
          </ol>
        </div>
        <T label="ลิงก์คลิปแนะนำตัว (YouTube / TikTok / Drive)" v={f.intro_video_url} on={(v) => set("intro_video_url", v)} ph="https://..." />
      </Section>

      {/* คำถามหลัก (ครีเอทีฟ / สำหรับผู้ฝึกงาน) */}
      <Section title={Q.primaryLabel}>
        {Q.primary.map((q, i) => (
          <div key={i} className="mb-3">
            <label className="label">{i + 1}. {q}</label>
            <textarea className="input" rows={2} value={f.creative_answers[`q${i + 1}`]}
              onChange={(e) => set("creative_answers", { ...f.creative_answers, [`q${i + 1}`]: e.target.value })} />
          </div>
        ))}
      </Section>

      {/* คำถามทัศนคติ (เฉพาะพนักงานประจำ) */}
      {Q.attitude.length > 0 && (
        <Section title="คำถามทัศนคติ">
          {Q.attitude.map((q, i) => (
            <div key={i} className="mb-3">
              <label className="label">{i + 1}. {q}</label>
              <textarea className="input" rows={2} value={f.attitude_answers[`q${i + 1}`]}
                onChange={(e) => set("attitude_answers", { ...f.attitude_answers, [`q${i + 1}`]: e.target.value })} />
            </div>
          ))}
        </Section>
      )}

      {/* consent */}
      <label className="flex items-start gap-3 rounded-xl border border-sand p-4 cursor-pointer">
        <input type="checkbox" className="mt-1 size-4" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
        <span className="text-sm">
          ฉันยินยอมให้ YuenDeaw เก็บข้อมูลใบสมัคร ผลงาน และคลิปแนะนำตัวไว้ในระบบ Talent Pool เพื่อใช้พิจารณางาน ตำแหน่ง หรือโปรเจกต์ที่เหมาะสมในอนาคต
        </span>
      </label>

      {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
      <button type="submit" disabled={busy || !f.consent} className="btn-brand w-full !py-3 text-base disabled:opacity-50">
        {busy ? "กำลังส่ง…" : "ส่งใบสมัคร"}
      </button>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3">{title}{hint && <span className="text-xs font-normal text-muted ml-2">{hint}</span>}</h3>
      {children}
    </div>
  );
}
function T({ label, v, on, ph, type = "text" }: { label: string; v: string; on: (v: string) => void; ph?: string; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" placeholder={ph} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
function Sel({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: { key: string; label: string }[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={v} onChange={(e) => on(e.target.value)}>
        <option value="">— เลือก —</option>
        {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  );
}
