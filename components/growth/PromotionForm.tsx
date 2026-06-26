"use client";

import { toCE } from "@/lib/utils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function PromotionForm({
  employees,
  levels,
  proposerId,
}: {
  employees: { id: string; name: string }[];
  levels: { id: string; name: string }[];
  proposerId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ employee_id: "", to_level_id: "", reason: "", effective_date: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employee_id) {
      setError("กรุณาเลือกพนักงาน");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("promotion_requests").insert({
      employee_id: f.employee_id,
      to_level_id: f.to_level_id || null,
      manager_comment: f.reason || null,
      effective_date: f.effective_date || null,
      proposed_by: proposerId,
      status: "proposed",
    });
    setLoading(false);
    if (error) return setError(error.message);
    setOpen(false);
    setF({ employee_id: "", to_level_id: "", reason: "", effective_date: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> เสนอเลื่อนตำแหน่ง
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">เสนอเลื่อนตำแหน่ง</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">พนักงาน</label>
            <select className="input" value={f.employee_id} onChange={(e) => setF({ ...f, employee_id: e.target.value })}>
              <option value="">— เลือกพนักงาน —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">เลื่อนไปที่ระดับ</label>
            <select className="input" value={f.to_level_id} onChange={(e) => setF({ ...f, to_level_id: e.target.value })}>
              <option value="">— เลือกระดับ —</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">เหตุผล / หลักฐาน</label>
            <textarea className="input" rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </div>
          <div>
            <label className="label">วันที่มีผล (ถ้าอนุมัติ)</label>
            <input type="date" className="input" value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: toCE(e.target.value) })} />
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full">
            {loading ? "กำลังส่ง…" : "ส่งข้อเสนอ"}
          </button>
        </div>
      </form>
    </div>
  );
}
