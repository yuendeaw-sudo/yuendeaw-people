"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { DEFAULT_OT_RATE } from "@/lib/ot";

export function OtRateForm({ employeeId, current }: { employeeId: string; current?: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(current != null ? String(current) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/ot/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, rate: rate === "" ? null : Number(rate) }),
      });
      if (!r.ok) return setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline !py-1 !px-2.5 text-xs">
        <Icon name="Pencil" className="size-3" /> ตั้งเรต OT
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <div className="relative card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">เรตค่า OT ต่อครั้ง</h3>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">จำนวนเงิน (บาท/ครั้ง)</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder={`เว้นว่าง = ใช้ค่าเริ่มต้น ${DEFAULT_OT_RATE.toLocaleString()}`}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted">
            เรตนี้จะใช้คิดเงินตอนอนุมัติ OT ของคนนี้ · ปรับเพิ่ม/ลดได้ทุกเมื่อ · เว้นว่างเพื่อกลับไปใช้ค่าเริ่มต้น {DEFAULT_OT_RATE.toLocaleString()} บาท
          </p>
          {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
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
