"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LevelForm({ trackId, nextOrder }: { trackId: string; nextOrder: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", responsibility: "", required_skill: "", evidence_needed: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("career_levels").insert({
      track_id: trackId,
      level_order: nextOrder,
      title: f.title.trim(),
      responsibility: f.responsibility || null,
      required_skill: f.required_skill || null,
      evidence_needed: f.evidence_needed || null,
    });
    setF({ title: "", responsibility: "", required_skill: "", evidence_needed: "" });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-gold hover:underline mt-2">
        + เพิ่มระดับ
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl bg-sand/40 p-3">
      <input className="input" placeholder="ชื่อระดับ เช่น Junior Producer" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <input className="input" placeholder="หน้าที่ความรับผิดชอบ" value={f.responsibility} onChange={(e) => setF({ ...f, responsibility: e.target.value })} />
      <input className="input" placeholder="ทักษะที่ต้องมี" value={f.required_skill} onChange={(e) => setF({ ...f, required_skill: e.target.value })} />
      <input className="input" placeholder="หลักฐานสำหรับเลื่อนขั้น" value={f.evidence_needed} onChange={(e) => setF({ ...f, evidence_needed: e.target.value })} />
      <div className="flex gap-2">
        <button disabled={busy} className="btn-brand text-xs px-3 py-1.5">บันทึก</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs px-3 py-1.5">ยกเลิก</button>
      </div>
    </form>
  );
}
