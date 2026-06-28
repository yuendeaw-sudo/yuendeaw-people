"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

export function CompDayOffGrant({ employees }: { employees: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ employeeId: "", days: "1", hours: "", workDate: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employeeId) return setErr("เลือกพนักงานก่อนนะ");
    if (!f.days || Number(f.days) <= 0) return setErr("ใส่จำนวนวัน");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/compday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: f.employeeId,
          days: Number(f.days),
          hours: f.hours ? Number(f.hours) : undefined,
          workDate: f.workDate || undefined,
          note: f.note,
        }),
      });
      if (!r.ok) return setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      setOpen(false);
      setF({ employeeId: "", days: "1", hours: "", workDate: "", note: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Icon name="Gift" className="size-4" /> ให้วันหยุดสะสม
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">ให้วันหยุดสะสม 🌴</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">
          ขอบคุณน้องที่ทุ่มเทเกินหน้าที่ — ให้วันหยุดสะสมไว้ใช้ทีหลังตามดุลยพินิจ
        </p>
        <div className="space-y-4">
          <div>
            <label className="label">พนักงาน</label>
            <select className="input" value={f.employeeId} onChange={(e) => set("employeeId", e.target.value)} required>
              <option value="">— เลือก —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">จำนวนวัน</label>
              <select className="input" value={f.days} onChange={(e) => set("days", e.target.value)}>
                <option value="0.5">ครึ่งวัน</option>
                <option value="1">1 วัน</option>
                <option value="1.5">1.5 วัน</option>
                <option value="2">2 วัน</option>
              </select>
            </div>
            <div>
              <label className="label">ชั่วโมงที่ทำ (ไม่บังคับ)</label>
              <input type="number" className="input" placeholder="เช่น 10" value={f.hours} onChange={(e) => set("hours", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">วันที่มาทำงาน (ไม่บังคับ)</label>
            <input type="date" className="input" value={f.workDate} onChange={(e) => set("workDate", e.target.value)} />
          </div>
          <div>
            <label className="label">โน้ตถึงน้อง (ไม่บังคับ)</label>
            <input className="input" placeholder="เช่น ขอบคุณที่มาช่วยอีเวนต์ทั้งวัน" value={f.note} onChange={(e) => set("note", e.target.value)} />
          </div>
          <p className="text-[11px] text-muted bg-sand/50 rounded-lg px-3 py-2 flex gap-1.5">
            <Icon name="Heart" className="size-3.5 shrink-0 mt-0.5 text-rose" />
            มาช่วยงาน 3–4 ชม. ถือเป็นงานปกติ — ให้วันสะสมเมื่อทุ่มเทเต็มวัน (ตื่นเช้า–เลิกดึก)
          </p>
          {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy} className="btn-brand w-full">
            {busy ? "กำลังบันทึก…" : "ให้วันหยุดสะสม"}
          </button>
        </div>
      </form>
    </div>
  );
}
