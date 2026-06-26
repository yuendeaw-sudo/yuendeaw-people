"use client";

import { toCE } from "@/lib/utils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { QUEST_TYPES } from "@/lib/quests";

export function QuestForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    type: "content",
    title: "",
    target: "",
    why_important: "",
    action_plan: "",
    start_date: "",
    end_date: "",
    evidence_plan: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function save(status: "draft" | "submitted") {
    if (!f.title.trim()) {
      setError("ตั้งชื่อภารกิจก่อนนะ");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("quests").insert({
      employee_id: employeeId,
      type: f.type,
      title: f.title.trim(),
      target: f.target || null,
      why_important: f.why_important || null,
      action_plan: f.action_plan || null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      evidence_plan: f.evidence_plan || null,
      status,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> สร้าง Growth Quest
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={(e) => { e.preventDefault(); save("submitted"); }} className="relative card p-6 w-full max-w-xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">สร้างภารกิจเติบโต 🎯</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">ประเภทภารกิจ</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {QUEST_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => set("type", t.key)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-semibold ${f.type === t.key ? "border-brand bg-brand-soft text-gold" : "border-sand"}`}
                >
                  <div className="text-base">{t.emoji}</div>
                  {t.th}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">ชื่อภารกิจ *</label>
            <input className="input" placeholder="เช่น เพิ่มผู้ติดตาม TikTok 100,000 คนในเดือน ก.ค." value={f.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="label">เป้าหมายที่วัดผลได้</label>
            <textarea className="input" rows={2} placeholder="เช่น Follower เพิ่มจาก 250k → 350k ภายใน 31 ก.ค." value={f.target} onChange={(e) => set("target", e.target.value)} />
          </div>
          <div>
            <label className="label">ทำไมสำคัญกับบริษัท (คิดแบบ owner)</label>
            <textarea className="input" rows={2} value={f.why_important} onChange={(e) => set("why_important", e.target.value)} />
          </div>
          <div>
            <label className="label">วิธีทำ / Action plan</label>
            <textarea className="input" rows={2} placeholder="เช่น ลงคลิป 3 ชิ้น/วัน, ทดลอง hook 5 แบบ" value={f.action_plan} onChange={(e) => set("action_plan", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันเริ่ม</label>
              <input type="date" className="input" value={f.start_date} onChange={(e) => set("start_date", toCE(e.target.value))} />
            </div>
            <div>
              <label className="label">วันสิ้นสุด</label>
              <input type="date" className="input" value={f.end_date} onChange={(e) => set("end_date", toCE(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">หลักฐานที่จะใช้ปิดภารกิจ</label>
            <input className="input" placeholder="เช่น screenshot analytics, link dashboard, revenue report" value={f.evidence_plan} onChange={(e) => set("evidence_plan", e.target.value)} />
          </div>

          <p className="text-xs text-muted bg-sand/40 rounded-xl px-3 py-2.5">
            <Icon name="Info" className="size-3.5 inline text-gold" /> Badge และรางวัลจะถูกกำหนดโดย Owner ตอนพิจารณาภารกิจ — โฟกัสที่เป้าหมายของคุณให้ชัดก็พอ 💪
          </p>

          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-brand flex-1">{busy ? "…" : "ส่งให้ Owner ตรวจ"}</button>
            <button type="button" disabled={busy} onClick={() => save("draft")} className="btn-ghost">บันทึกร่าง</button>
          </div>
        </div>
      </form>
    </div>
  );
}
