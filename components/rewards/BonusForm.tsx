"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { BONUS_CATEGORIES } from "@/lib/phase2-labels";

export function BonusForm({
  employees,
  proposerId,
}: {
  employees: { id: string; name: string }[];
  proposerId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ employee_id: "", category: "performance", amount: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employee_id || !f.amount) {
      setError("กรุณาเลือกพนักงานและกรอกจำนวนเงิน");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("bonus_requests").insert({
      employee_id: f.employee_id,
      category: f.category,
      amount: Number(f.amount),
      reason: f.reason || null,
      proposed_by: proposerId,
      status: "proposed",
    });
    setLoading(false);
    if (error) return setError(error.message);
    setOpen(false);
    setF({ employee_id: "", category: "performance", amount: "", reason: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> เสนอโบนัส
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">เสนอโบนัส / รางวัล</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ประเภท</label>
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {BONUS_CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">จำนวนเงิน (บาท)</label>
              <input type="number" className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">เหตุผล / หลักฐาน</label>
            <textarea className="input" rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
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
