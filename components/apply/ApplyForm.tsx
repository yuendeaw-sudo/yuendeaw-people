"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "url";
  section?: string;
  help?: string;
};

const SECTION_META: Record<string, { emoji: string; title: string; hint?: string }> = {
  about: { emoji: "📝", title: "เกี่ยวกับคุณ" },
  study: { emoji: "🎓", title: "เรื่องเรียน" },
  goal: { emoji: "🎯", title: "อยากฝึกอะไร" },
  vibe: { emoji: "🎤", title: "ตัวตน & รสนิยมคอนเทนต์", hint: "ส่วนนี้แหละที่เราชอบอ่านที่สุด" },
  time: { emoji: "📅", title: "ช่วงเวลา" },
  show: { emoji: "🔗", title: "โชว์ผลงาน", hint: "มีเท่าไหร่ใส่มาได้เลย ไม่มีก็ไม่เป็นไร" },
};

export function ApplyForm({
  form,
}: {
  form: { id: string; kind: string; title: string; fields: FieldDef[] };
}) {
  const isIntern = form.kind === "internship";
  const [base, setBase] = useState({
    full_name: "",
    nickname: "",
    email: "",
    phone: "",
    position: "",
    field_interest: "",
    portfolio_url: "",
    expected_salary: "",
    available_date: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setA(key: string, val: string) {
    setAnswers((a) => ({ ...a, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("กรุณายินยอมเงื่อนไข PDPA ก่อนส่งใบสมัครนะ 🙏");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("applications").insert({
      form_id: form.id,
      kind: form.kind,
      full_name: base.full_name,
      nickname: base.nickname || null,
      email: base.email,
      phone: base.phone || null,
      position: isIntern ? answers.position || null : base.position || null,
      field_interest: base.field_interest || null,
      portfolio_url: isIntern ? answers.portfolio_url || null : base.portfolio_url || null,
      expected_salary: base.expected_salary || null,
      available_date: isIntern ? answers.start_date || null : base.available_date || null,
      answers,
      pdpa_consent: true,
      stage: "new",
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="card p-10 text-center relative overflow-hidden">
        <div className="absolute -top-3 -right-3 text-5xl rotate-12 opacity-20 select-none">🎉</div>
        <div className="mx-auto grid place-items-center size-16 rounded-2xl bg-mint-soft text-mint mb-4">
          <Icon name="PartyPopper" className="size-8" />
        </div>
        <h2 className="text-2xl font-extrabold">ส่งใบสมัครเรียบร้อย! 🎉</h2>
        <p className="text-muted mt-2 max-w-sm mx-auto">
          ขอบคุณที่สนใจมาเป็นส่วนหนึ่งของทีม YuenDeaw — เดี๋ยวทีมงานจะอ่านทุกคำตอบของคุณแล้วติดต่อกลับทางอีเมลนะ ✨
        </p>
      </div>
    );
  }

  const FIELDS = ["production", "content", "comedy", "event", "editing", "admin", "ai", "design", "studio"];

  // group custom fields by section, preserving order of first appearance
  const order: string[] = [];
  const grouped: Record<string, FieldDef[]> = {};
  for (const f of form.fields ?? []) {
    const s = f.section || "about";
    if (!grouped[s]) {
      grouped[s] = [];
      order.push(s);
    }
    grouped[s].push(f);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* time estimate chip */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="chip bg-brand-soft text-gold">⏱️ ใช้เวลา ~5 นาที</span>
        <span>กรอกสบาย ๆ ไม่ต้องเป๊ะ</span>
      </div>

      {/* identity */}
      <SectionCard emoji="👋" title="แนะนำตัวหน่อย">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ชื่อ-นามสกุล" required value={base.full_name} onChange={(v) => setBase({ ...base, full_name: v })} />
          <Field label="ชื่อเล่น" value={base.nickname} onChange={(v) => setBase({ ...base, nickname: v })} />
          <Field label="เบอร์โทรศัพท์" value={base.phone} onChange={(v) => setBase({ ...base, phone: v })} />
          <Field label="อีเมล" type="email" required value={base.email} onChange={(v) => setBase({ ...base, email: v })} />
        </div>
      </SectionCard>

      {/* job-only extras */}
      {!isIntern && (
        <SectionCard emoji="💼" title="เรื่องงาน">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="ตำแหน่งที่สนใจ" value={base.position} onChange={(v) => setBase({ ...base, position: v })} />
            <div>
              <label className="label">สายงานที่สนใจ</label>
              <select className="input" value={base.field_interest} onChange={(e) => setBase({ ...base, field_interest: e.target.value })}>
                <option value="">— เลือก —</option>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <Field label="Link Portfolio" type="url" value={base.portfolio_url} onChange={(v) => setBase({ ...base, portfolio_url: v })} />
            <Field label="เงินเดือนที่คาดหวัง" value={base.expected_salary} onChange={(v) => setBase({ ...base, expected_salary: v })} />
            <Field label="วันที่เริ่มงานได้" type="date" value={base.available_date} onChange={(v) => setBase({ ...base, available_date: v })} />
          </div>
        </SectionCard>
      )}

      {/* dynamic custom sections */}
      {order.map((s) => {
        const meta = SECTION_META[s] ?? { emoji: "✏️", title: s };
        const fields = grouped[s];
        return (
          <SectionCard key={s} emoji={meta.emoji} title={meta.title} hint={meta.hint}>
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((f) => {
                const span = f.type === "textarea" ? "sm:col-span-2" : "";
                return (
                  <div key={f.key} className={span}>
                    <label className="label">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea className="input" rows={3} value={answers[f.key] ?? ""} onChange={(e) => setA(f.key, e.target.value)} />
                    ) : (
                      <input
                        className="input"
                        type={f.type === "date" ? "date" : "text"}
                        placeholder={f.type === "url" ? "https://" : undefined}
                        value={answers[f.key] ?? ""}
                        onChange={(e) => setA(f.key, e.target.value)}
                      />
                    )}
                    {f.help && <p className="text-xs text-muted mt-1">{f.help}</p>}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })}

      {/* consent */}
      <label className="flex items-start gap-2.5 text-sm rounded-xl2 bg-sand/40 p-4 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span className="text-muted">
          ยินยอมให้ YuenDeaw เก็บและใช้ข้อมูลส่วนบุคคลเพื่อพิจารณารับสมัครตามนโยบาย PDPA
        </span>
      </label>

      {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}

      <button type="submit" disabled={loading} className="btn-brand w-full text-base py-3">
        {loading ? "กำลังส่ง…" : "ส่งใบสมัคร 🚀"}
      </button>
      <p className="text-center text-xs text-muted">เราอ่านทุกใบสมัครจริง ๆ — ตอบมาเป็นตัวเองที่สุดได้เลย 💛</p>
    </form>
  );
}

function SectionCard({
  emoji,
  title,
  hint,
  children,
}: {
  emoji: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="grid place-items-center size-9 rounded-xl bg-brand-soft text-lg">{emoji}</span>
        <div>
          <h3 className="font-bold leading-tight">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <input
        className="input"
        type={type === "url" ? "text" : type}
        placeholder={type === "url" ? "https://" : undefined}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
