"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { OT_TYPES, OT_RATE, OT_NOT_ELIGIBLE } from "@/lib/ot";

export function OvertimeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [otType, setOtType] = useState(OT_TYPES[0].key);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setErr("เลือกวันที่ก่อนนะ");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/ot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDate: date, otType, reason }),
      });
      if (!r.ok) return setErr((await r.text()) || "ส่งคำขอไม่สำเร็จ");
      setOpen(false);
      setDate("");
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Icon name="Clock" className="size-4" /> เขียนเบิก OT
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">เขียนเบิก OT</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">
          เบิกเหมา <b className="text-ink">{OT_RATE.toLocaleString()} บาท/ครั้ง</b> · หัวหน้า/ผู้อนุมัติจะตรวจอีกที
        </p>

        <div className="space-y-2 mb-4">
          {OT_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setOtType(t.key)}
              className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                otType === t.key ? "border-brand bg-brand-soft" : "border-sand hover:bg-sand/40"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Icon name={t.icon} className="size-4 text-gold" /> {t.label}
              </div>
              <p className="text-xs text-muted mt-1">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">วันที่ทำงาน</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">รายละเอียดงาน (ไม่บังคับ)</label>
            <input className="input" placeholder="เช่น มาช่วยถ่ายคอนเทนต์ / ออกกองที่..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted bg-sand/50 rounded-lg px-3 py-2 flex gap-1.5">
            <Icon name="Info" className="size-3.5 shrink-0 mt-0.5" /> {OT_NOT_ELIGIBLE}
          </p>
          {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy} className="btn-brand w-full">
            {busy ? "กำลังส่ง…" : "ส่งคำขอเบิก OT"}
          </button>
        </div>
      </form>
    </div>
  );
}
