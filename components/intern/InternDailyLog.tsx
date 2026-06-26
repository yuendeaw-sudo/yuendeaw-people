"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatThaiDate, formatTHB } from "@/lib/utils";

type Log = { log_date: string; content: string };
type Stipend = {
  evalStatus: string | null; // null | pending | passed | failed
  stipendStart: string | null;
  rate: number;
  monthDays: number;
  monthEarned: number;
  totalDays: number;
  totalEarned: number;
  daysSinceStart?: number; // ฝึกงานมาแล้วกี่วัน (นับจากวันเริ่ม)
  evalDue?: string | null; // กำหนดประเมิน
};

export function InternDailyLog({
  todayDate,
  todayLog,
  recentLogs,
  stipend,
}: {
  todayDate: string;
  todayLog: string;
  recentLogs: Log[];
  stipend: Stipend;
}) {
  const router = useRouter();
  const [content, setContent] = useState(todayLog);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const passed = stipend.evalStatus === "passed";

  async function save() {
    if (!content.trim()) return setErr("เขียนบันทึกก่อนนะ");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/intern/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, log_date: todayDate }),
      });
      if (!r.ok) setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ความคืบหน้า + สถานะเบี้ยฝึก */}
      <div className={`rounded-xl2 p-4 ${passed ? "bg-mint-soft" : "bg-sand/50"}`}>
        {stipend.daysSinceStart != null && (
          <div className="text-sm mb-2 flex items-center gap-1.5">
            <Icon name="CalendarDays" className="size-4 text-gold" />
            ฝึกงานมาแล้ว <b>{stipend.daysSinceStart} วัน</b>
          </div>
        )}
        {passed ? (
          <>
            <div className="text-sm font-semibold text-mint flex items-center gap-1.5 flex-wrap">
              <Icon name="CircleCheck" className="size-4" /> ผ่านประเมินแล้ว
              {stipend.stipendStart && (
                <span className="font-normal text-muted">· ตั้งแต่ {formatThaiDate(stipend.stipendStart)}</span>
              )}
              <span className="font-normal">— รับเบี้ยฝึก {formatTHB(stipend.rate)}/วัน</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>เดือนนี้: <b>{stipend.monthDays} วัน</b> · {formatTHB(stipend.monthEarned)}</span>
              <span className="text-muted">รวมทั้งหมด: {stipend.totalDays} วัน · {formatTHB(stipend.totalEarned)}</span>
            </div>
          </>
        ) : (
          <div className="text-sm">
            <span className="font-semibold flex items-center gap-1.5 flex-wrap">
              <Icon name="Hourglass" className="size-4 text-gold" /> รอประเมิน (ช่วงทดลองฝึกงาน)
              {stipend.evalDue && (
                <span className="font-normal text-muted">· กำหนดประเมิน {formatThaiDate(stipend.evalDue)}</span>
              )}
            </span>
            <p className="text-muted mt-1">
              เดือนแรกยังไม่มีเบี้ยฝึก — ขยันเขียนบันทึกทุกวัน รอพี่เลี้ยงประเมิน ผ่านแล้วเริ่มได้เบี้ย {formatTHB(stipend.rate)}/วัน 💪
            </p>
          </div>
        )}
      </div>

      {/* เขียนบันทึกวันนี้ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-sm">บันทึกวันนี้ · {formatThaiDate(todayDate)}</label>
          {todayLog && <span className="chip bg-mint-soft text-mint text-[11px]">✓ เขียนแล้ว</span>}
        </div>
        <textarea
          className="input min-h-28"
          placeholder="วันนี้ทำอะไรบ้าง เรียนรู้อะไร ติดปัญหาตรงไหน…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {err && <p className="text-sm text-rose mt-1">{err}</p>}
        <button onClick={save} disabled={busy} className="btn-brand mt-2">
          <Icon name={saved ? "Check" : "Save"} className="size-4" />
          {busy ? "กำลังบันทึก…" : saved ? "บันทึกแล้ว" : todayLog ? "อัปเดตบันทึก" : "บันทึกเข้างานวันนี้"}
        </button>
        <p className="text-[11px] text-muted mt-2">
          ⚠️ วันไหนไม่เขียนบันทึก หรือลา = ถือว่าขาดงาน (ไม่นับเบี้ยฝึกวันนั้น)
        </p>
      </div>

      {/* ประวัติบันทึก */}
      {recentLogs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted mb-2">บันทึกย้อนหลัง</h4>
          <div className="space-y-2">
            {recentLogs.map((l) => (
              <div key={l.log_date} className="rounded-xl bg-sand/40 px-3 py-2">
                <div className="text-xs font-medium text-gold">{formatThaiDate(l.log_date)}</div>
                <div className="text-sm whitespace-pre-wrap">{l.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
