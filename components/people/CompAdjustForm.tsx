"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const COMP_TYPES = [
  { id: "monthly_salary", name: "เงินเดือน" },
  { id: "hourly", name: "รายชั่วโมง" },
  { id: "per_day", name: "รายวัน" },
  { id: "per_show", name: "ต่อโชว์" },
  { id: "project", name: "ต่อโปรเจกต์" },
];

export function CompAdjustForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ comp_type: "monthly_salary", amount: "", effective_date: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.amount || Number(f.amount) <= 0) return setErr("กรอกจำนวนเงิน");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, ...f, amount: Number(f.amount) }),
      });
      if (!r.ok) setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      else {
        setOpen(false);
        setF({ comp_type: "monthly_salary", amount: "", effective_date: "", note: "" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline !py-1.5 !px-3 text-sm">
        <Icon name="Plus" className="size-3.5" /> ปรับเงินเดือน
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <div className="relative card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">ปรับเพิ่ม / ลดเงินเดือน</h3>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ประเภท</label>
              <select className="input" value={f.comp_type} onChange={(e) => set("comp_type", e.target.value)}>
                {COMP_TYPES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">จำนวนเงิน (บาท)</label>
              <input type="number" className="input" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">มีผลตั้งแต่</label>
            <input type="date" className="input" value={f.effective_date} onChange={(e) => set("effective_date", e.target.value)} />
          </div>
          <div>
            <label className="label">หมายเหตุ (ไม่บังคับ)</label>
            <input className="input" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="เช่น ปรับขึ้นตามผลงาน" />
          </div>
          {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
          <p className="text-[11px] text-muted">ระบบเก็บเป็นประวัติ ไม่ทับของเก่า — ค่าล่าสุดจะเป็นเงินเดือนปัจจุบัน</p>
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-brand">
              <Icon name="Check" className="size-4" /> {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button onClick={() => setOpen(false)} disabled={busy} className="btn-outline">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}
