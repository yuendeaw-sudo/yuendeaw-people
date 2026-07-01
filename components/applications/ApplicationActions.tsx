"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { HR_SCORE_FIELDS, HR_RECOMMENDATION, DEFAULT_TAGS } from "@/lib/applications";

type Opt = { id: string; name: string };

async function patch(id: string, body: any) {
  return fetch(`/api/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ApplicationActions({
  app,
  canEdit,
  isOwner,
  canConvert = false,
  employees,
  teams,
}: {
  app: any;
  canEdit: boolean;
  isOwner: boolean;
  canConvert?: boolean;
  employees: Opt[];
  teams: Opt[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      {canEdit && <HrPanel app={app} employees={employees} onDone={refresh} />}
      {isOwner && <OwnerPanel app={app} employees={employees} onDone={refresh} />}
      {(isOwner || canConvert) && <ConvertPanel app={app} employees={employees} teams={teams} onDone={refresh} />}
    </div>
  );
}

/* ---------------- HR Screening ---------------- */
function HrPanel({ app, employees, onDone }: { app: any; employees: Opt[]; onDone: () => void }) {
  const [iv, setIv] = useState(false);
  const [score, setScore] = useState<Record<string, number>>(app.hr_score ?? {});
  const [rec, setRec] = useState(app.hr_recommendation ?? "");
  const [summary, setSummary] = useState(app.hr_summary ?? "");
  const [strengths, setStrengths] = useState((app.strengths ?? []).join("\n"));
  const [concerns, setConcerns] = useState((app.concerns ?? []).join("\n"));
  const [tags, setTags] = useState<string[]>(app.tags ?? []);
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState(app.internal_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  const overall = () => {
    const vals = HR_SCORE_FIELDS.map((f) => score[f.key]).filter(Boolean) as number[];
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const toggleTag = (t: string) => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function save() {
    setBusy("save");
    await patch(app.id, {
      action: "screen",
      hr_score: score,
      hr_recommendation: rec || null,
      hr_summary: summary,
      strengths: String(strengths).split("\n").map((s: string) => s.trim()).filter(Boolean),
      concerns: String(concerns).split("\n").map((s: string) => s.trim()).filter(Boolean),
      tags,
      internal_notes: notes,
      score: overall() ? Math.round(overall()!) : null,
    });
    setBusy(null);
    onDone();
  }
  async function setStage(stage: string, label: string) {
    if (stage === "rejected" && !confirm("ยืนยันไม่ผ่าน?")) return;
    setBusy(stage);
    await patch(app.id, { action: "status", stage });
    setBusy(null);
    onDone();
  }

  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="ClipboardCheck" className="size-4 text-gold" /> HR Screening</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {HR_SCORE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <select className="input" value={score[f.key] ?? ""} onChange={(e) => setScore((s) => ({ ...s, [f.key]: Number(e.target.value) }))}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="label">คำแนะนำรวม</label>
          <select className="input" value={rec} onChange={(e) => setRec(e.target.value)}>
            <option value="">—</option>
            {HR_RECOMMENDATION.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </div>
      {overall() != null && <p className="text-xs text-muted mt-1">คะแนนเฉลี่ย: <b>{overall()}</b>/5</p>}

      <label className="label mt-3">สรุปโดย HR</label>
      <textarea className="input" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="สรุปสั้น ๆ 2-3 บรรทัด" />
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="label">จุดเด่น (บรรทัดละข้อ)</label>
          <textarea className="input" rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </div>
        <div>
          <label className="label">ข้อกังวล (บรรทัดละข้อ)</label>
          <textarea className="input" rows={3} value={concerns} onChange={(e) => setConcerns(e.target.value)} />
        </div>
      </div>

      <label className="label mt-3">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {[...new Set([...DEFAULT_TAGS, ...tags])].map((t) => (
          <button key={t} type="button" onClick={() => toggleTag(t)}
            className={`chip text-[11px] ${tags.includes(t) ? "bg-brand-soft text-gold border border-brand" : "bg-sand text-muted"}`}>
            {tags.includes(t) ? "✓ " : ""}{t}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input className="input flex-1" placeholder="เพิ่ม tag ใหม่…" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="button" onClick={() => { const t = custom.trim(); if (t && !tags.includes(t)) { setTags([...tags, t]); setCustom(""); } }} className="btn-outline">เพิ่ม</button>
      </div>

      <label className="label mt-3">โน้ตภายใน</label>
      <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={save} disabled={!!busy} className="btn-brand">{busy === "save" ? "…" : "บันทึกคะแนน/แท็ก"}</button>
        <button onClick={() => setIv(true)} disabled={!!busy} className="btn bg-mint text-white px-3"><Icon name="CalendarPlus" className="size-4" /> เชิญสัมภาษณ์</button>
        <button onClick={() => setStage("owner_review", "owner")} disabled={!!busy} className="btn-outline">ส่งเข้า Owner Review</button>
        <button onClick={() => setStage("talent_pool", "pool")} disabled={!!busy} className="btn-outline">เก็บ Talent Pool</button>
        <button onClick={() => setStage("rejected", "rej")} disabled={!!busy} className="btn-outline !text-rose !border-rose/40">ไม่ผ่าน</button>
      </div>
      {iv && <InterviewModal app={app} employees={employees} onClose={() => setIv(false)} onDone={onDone} />}
    </div>
  );
}

/* ---------------- Owner Review + Interview ---------------- */
const OWNER_DECISIONS = [
  { key: "interview", label: "เรียกสัมภาษณ์", tone: "mint" },
  { key: "keep", label: "เก็บไว้ก่อน", tone: "sand" },
  { key: "reject", label: "ไม่ผ่านตอนนี้", tone: "rose" },
  { key: "ask_hr_more", label: "ส่งกลับให้ HR ดูเพิ่ม", tone: "amber" },
  { key: "project_candidate", label: "น่าสนใจสำหรับโปรเจกต์อื่น", tone: "grape" },
];

function OwnerPanel({ app, employees, onDone }: { app: any; employees: Opt[]; onDone: () => void }) {
  const [note, setNote] = useState(app.owner_note ?? "");
  const [busy, setBusy] = useState(false);
  const [iv, setIv] = useState(false);

  async function decide(key: string) {
    if (key === "interview") { setIv(true); return; }
    setBusy(true);
    const stage = key === "reject" ? "rejected" : key === "ask_hr_more" ? "hr_screening" : key === "project_candidate" ? "talent_pool" : app.stage;
    await patch(app.id, { action: "owner", owner_decision: key, owner_note: note });
    if (stage !== app.stage) await patch(app.id, { action: "status", stage });
    setBusy(false);
    onDone();
  }

  return (
    <div className="card p-5 border-amber-soft">
      <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="Crown" className="size-4 text-gold" /> Owner Review</h3>
      <textarea className="input mb-3" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตของ Owner" />
      <div className="flex flex-wrap gap-2">
        {OWNER_DECISIONS.map((d) => (
          <button key={d.key} onClick={() => decide(d.key)} disabled={busy}
            className={`btn text-sm px-3 ${d.key === "interview" ? "bg-mint text-white" : "btn-outline"}`}>
            {d.label}
          </button>
        ))}
      </div>
      {app.owner_decision && <p className="text-xs text-muted mt-2">ตัดสินใจล่าสุด: {OWNER_DECISIONS.find((d) => d.key === app.owner_decision)?.label}</p>}
      {iv && <InterviewModal app={app} employees={employees} onClose={() => setIv(false)} onDone={onDone} />}
    </div>
  );
}

function InterviewModal({ app, employees, onClose, onDone }: { app: any; employees: Opt[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    type: "Owner Interview", date: "", start: "", end: "", location: "Google Meet",
    notes_for_candidate: "", internal_notes: "",
  });
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; mock: boolean } | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!f.date) return;
    setBusy(true);
    const r = await patch(app.id, { action: "interview", interview: { ...f, interviewers } });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j?.interview?.meet_url) setResult({ url: j.interview.meet_url, mock: !!j.interview.mock });
    else { onDone(); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">นัดสัมภาษณ์</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><Icon name="X" className="size-5" /></button>
        </div>
        {result ? (
          <div className="space-y-3 text-center">
            <Icon name="CircleCheck" className="size-10 text-mint mx-auto" />
            <p className="font-medium">นัดสัมภาษณ์เรียบร้อย</p>
            <a href={result.url} target="_blank" rel="noreferrer" className="btn-brand inline-flex"><Icon name="Video" className="size-4" /> เปิด Google Meet</a>
            {result.mock ? (
              <p className="text-[11px] text-amber">* ลิงก์ทดสอบ (mock) — ตั้ง Google Service Account ใน Vercel เพื่อสร้าง Calendar/Meet จริง + ส่ง invite</p>
            ) : (
              <p className="text-[11px] text-mint">✓ สร้าง Google Calendar + ส่ง invite ให้ผู้สมัครและผู้สัมภาษณ์แล้ว</p>
            )}
            <button onClick={() => { onDone(); onClose(); }} className="btn-outline w-full">เสร็จ</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">ประเภท</label>
              <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
                {["HR Screening", "Owner Interview", "Team Interview", "Final Interview"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">วันที่</label><input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
              <div><label className="label">เริ่ม</label><input type="time" className="input" value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
              <div><label className="label">จบ</label><input type="time" className="input" value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
            </div>
            <div>
              <label className="label">รูปแบบ</label>
              <select className="input" value={f.location} onChange={(e) => set("location", e.target.value)}>
                {["Google Meet", "On-site", "Phone"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ผู้สัมภาษณ์</label>
              <div className="flex flex-wrap gap-1.5">
                {employees.map((e) => (
                  <button key={e.id} type="button" onClick={() => setInterviewers((s) => s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id])}
                    className={`chip text-[11px] ${interviewers.includes(e.id) ? "bg-brand-soft text-gold border border-brand" : "bg-sand text-muted"}`}>
                    {interviewers.includes(e.id) ? "✓ " : ""}{e.name}
                  </button>
                ))}
              </div>
            </div>
            <textarea className="input" rows={2} value={f.notes_for_candidate} onChange={(e) => set("notes_for_candidate", e.target.value)} placeholder="หมายเหตุถึงผู้สมัคร" />
            <button onClick={save} disabled={busy || !f.date} className="btn-brand w-full">{busy ? "…" : "สร้างนัด + ส่ง invite"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Convert ---------------- */
function ConvertPanel({ app, employees, teams, onDone }: { app: any; employees: Opt[]; teams: Opt[]; onDone: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  const [f, setF] = useState<any>({ position: app.position || "", team_id: "", manager_id: "", start_date: "", salary: "", allowance: "200", internship_start_date: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));

  if (app.converted_kind) {
    return (
      <div className="card p-5 bg-mint-soft/30">
        <p className="text-sm flex items-center gap-2"><Icon name="CircleCheck" className="size-4 text-mint" /> แปลงเป็น{app.converted_kind === "employee" ? "พนักงาน" : app.converted_kind === "intern" ? "เด็กฝึก" : "ฟรีแลนซ์"}แล้ว</p>
      </div>
    );
  }

  async function convert() {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/applications/${app.id}/convert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, ...f }),
    });
    setBusy(false);
    if (!r.ok) return setErr((await r.text()) || "แปลงไม่สำเร็จ");
    onDone();
  }

  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="UserPlus" className="size-4 text-gold" /> รับเข้าทำงาน (Convert)</h3>
      <div className="flex flex-wrap gap-2">
        {[{ k: "employee", l: "เป็นพนักงาน" }, { k: "intern", l: "เป็นเด็กฝึก" }, { k: "freelance", l: "เป็นฟรีแลนซ์" }].map((t) => (
          <button key={t.k} onClick={() => setTarget(t.k)} className={`btn text-sm px-3 ${target === t.k ? "btn-brand" : "btn-outline"}`}>{t.l}</button>
        ))}
      </div>
      {target && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div><label className="label">ตำแหน่ง</label><input className="input" value={f.position} onChange={(e) => set("position", e.target.value)} /></div>
          <div><label className="label">ทีม</label><select className="input" value={f.team_id} onChange={(e) => set("team_id", e.target.value)}><option value="">—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><label className="label">หัวหน้า</label><select className="input" value={f.manager_id} onChange={(e) => set("manager_id", e.target.value)}><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div><label className="label">วันเริ่มงาน</label><input type="date" className="input" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
          {target === "intern" ? (
            <div><label className="label">เบี้ยเลี้ยง/วัน</label><input type="number" className="input" value={f.allowance} onChange={(e) => set("allowance", e.target.value)} /></div>
          ) : (
            <div><label className="label">{target === "freelance" ? "เรต" : "เงินเดือน"}</label><input type="number" className="input" value={f.salary} onChange={(e) => set("salary", e.target.value)} /></div>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={convert} disabled={busy} className="btn-brand">{busy ? "…" : "ยืนยันแปลง + สร้างโปรไฟล์"}</button>
            <button onClick={() => setTarget(null)} className="btn-outline">ยกเลิก</button>
          </div>
          {err && <p className="sm:col-span-2 text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
        </div>
      )}
    </div>
  );
}
