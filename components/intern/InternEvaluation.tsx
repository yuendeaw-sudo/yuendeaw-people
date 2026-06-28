"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { toCE, formatThaiDate } from "@/lib/utils";

export function InternEvaluation({
  employeeId,
  defaultStipendStart,
}: {
  employeeId: string;
  /** วันเริ่มเบี้ยตามนโยบาย = วันที่น้องครบ 1 เดือน (ใช้เป็นค่าเริ่มต้น) */
  defaultStipendStart?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("passed");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [stipendStart, setStipendStart] = useState(defaultStipendStart || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/intern/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intern_id: employeeId,
          status,
          score: score || null,
          comment: comment || null,
          // ส่งวันเริ่มเบี้ย (ย้อนหลังได้) เฉพาะตอนผ่าน
          stipend_start_date: status === "passed" ? toCE(stipendStart) || undefined : undefined,
        }),
      });
      if (!r.ok) setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="ClipboardCheck" className="size-4" /> ประเมินน้องฝึก
      </button>
    );
  }

  return (
    <div className="rounded-xl2 border border-sand p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">ผลประเมิน</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="passed">ผ่าน — เริ่มจ่ายเบี้ยฝึก</option>
            <option value="failed">ไม่ผ่าน</option>
          </select>
        </div>
        <div>
          <label className="label">คะแนน (1–5, ไม่บังคับ)</label>
          <input type="number" min={1} max={5} className="input" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
      </div>

      {status === "passed" && (
        <div>
          <label className="label">วันเริ่มรับเบี้ยฝึก (ตั้งย้อนหลังได้)</label>
          <input
            type="date"
            className="input"
            value={stipendStart}
            onChange={(e) => setStipendStart(e.target.value)}
          />
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            ถ้าประเมินช้ากว่ากำหนด ให้ตั้งเป็น <b>วันที่น้องฝึกครบ 1 เดือน</b>
            {defaultStipendStart && ` (≈ ${formatThaiDate(defaultStipendStart)})`} เพื่อไม่ให้น้องเสียสิทธิ์ —
            เบี้ยจะนับเฉพาะวันที่น้องเขียนบันทึกตั้งแต่วันนี้เป็นต้นไป
          </p>
        </div>
      )}

      <div>
        <label className="label">ความเห็นพี่เลี้ยง</label>
        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-brand">
          <Icon name="Check" className="size-4" /> {busy ? "กำลังบันทึก…" : "บันทึกผลประเมิน"}
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="btn-outline">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
