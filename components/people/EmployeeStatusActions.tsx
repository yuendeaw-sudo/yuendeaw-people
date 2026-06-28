"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const EXIT_REASONS_EMPLOYEE = [
  { v: "resigned", label: "ลาออกเอง" },
  { v: "failed_probation", label: "ไม่ผ่านทดลองงาน" },
  { v: "terminated", label: "ถูกให้ออก / เลิกจ้าง" },
  { v: "to_freelance", label: "ออกไปเป็นฟรีแลนซ์" },
];
const EXIT_REASONS_INTERN = [
  { v: "internship_completed", label: "จบฝึกงานตามกำหนด" },
  { v: "resigned", label: "ลาออกเอง" },
  { v: "terminated", label: "ให้ออก (ไม่ผ่าน)" },
];

export function EmployeeStatusActions({
  employeeId,
  isIntern,
  status,
  name,
}: {
  employeeId: string;
  isIntern: boolean;
  status: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ label: string; run: () => Promise<void> } | null>(null);

  const isAlumni = status === "alumni" || status === "inactive";
  const reasons = isIntern ? EXIT_REASONS_INTERN : EXIT_REASONS_EMPLOYEE;
  const [reason, setReason] = useState(reasons[0].v);
  const [note, setNote] = useState("");
  const [endDate, setEndDate] = useState("");

  async function call(payload: Record<string, any>, successLabel: string) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/employee/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, ...payload }),
      });
      if (!r.ok) {
        setErr((await r.text()) || "ทำรายการไม่สำเร็จ");
        return;
      }
      setOpen(false);
      setConfirm(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const convert = (toKey: string, label: string) =>
    setConfirm({ label: `ยืนยันปรับ ${name} เป็น “${label}” ?`, run: () => call({ action: "convert", toKey }, label) });

  const offboard = () =>
    setConfirm({
      label: `ยืนยันบันทึกการออกของ ${name} ?`,
      run: () => call({ action: "offboard", reason, note, end_date: endDate || undefined }, "ออกจากงาน"),
    });

  const reactivate = () =>
    setConfirm({ label: `นำ ${name} กลับเข้าทำงาน ?`, run: () => call({ action: "reactivate" }, "คืนสถานะ") });

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline !py-1.5 !px-3 text-sm">
        <Icon name="Settings2" className="size-3.5" /> จัดการสถานะ
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => !busy && setOpen(false)} />
          <div className="relative card p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">จัดการสถานะ — {name}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <Icon name="X" className="size-5" />
              </button>
            </div>

            {/* คนที่ออกไปแล้ว → คืนสถานะ */}
            {isAlumni ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  คนนี้อยู่ในสถานะ <b>ศิษย์เก่า / ออกแล้ว</b> — ข้อมูลและประวัติยังถูกเก็บไว้ครบ
                </p>
                <button onClick={reactivate} disabled={busy} className="btn-brand w-full">
                  <Icon name="RotateCcw" className="size-4" /> นำกลับเข้าทำงาน
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* เด็กฝึก: แปลงสถานะ */}
                {isIntern && (
                  <div>
                    <div className="label mb-2">ปรับรูปแบบการจ้าง</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => convert("full_time", "พนักงานประจำ")} disabled={busy} className="btn-outline !py-2 flex-col text-xs">
                        <Icon name="UserCheck" className="size-4" /> เป็นพนักงานประจำ
                      </button>
                      <button onClick={() => convert("freelance", "ฟรีแลนซ์")} disabled={busy} className="btn-outline !py-2 flex-col text-xs">
                        <Icon name="Briefcase" className="size-4" /> เป็นฟรีแลนซ์
                      </button>
                      <button onClick={() => convert("intern", "ฝึกงานต่อ")} disabled={busy} className="btn-outline !py-2 flex-col text-xs">
                        <Icon name="GraduationCap" className="size-4" /> ฝึกงานต่อ
                      </button>
                    </div>
                    {isIntern && (
                      <p className="text-[11px] text-muted mt-2">
                        แปลงเป็นพนักงานประจำ/ฟรีแลนซ์แล้ว อย่าลืมตั้งเงินเดือนในแท็บ “เงินเดือน/ค่าจ้าง”
                      </p>
                    )}
                    <hr className="my-4 border-line" />
                  </div>
                )}

                {/* ออกจากงาน → alumni */}
                <div>
                  <div className="label mb-2 flex items-center gap-1.5 text-rose">
                    <Icon name="LogOut" className="size-3.5" /> บันทึกการออกจากงาน
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="label">เหตุผล</label>
                      <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                        {reasons.map((r) => (
                          <option key={r.v} value={r.v}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">วันสุดท้ายที่ทำงาน (ไม่บังคับ — เว้นไว้ = วันนี้)</label>
                      <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">หมายเหตุ (ไม่บังคับ)</label>
                      <textarea className="input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม เช่น ส่งงานต่อให้ใคร / เหตุผลโดยละเอียด" />
                    </div>
                    <button onClick={offboard} disabled={busy} className="btn-outline w-full !text-rose !border-rose/40 hover:!bg-rose-soft">
                      <Icon name="LogOut" className="size-4" /> ย้ายไปศิษย์เก่า (ออกจากงาน)
                    </button>
                    <p className="text-[11px] text-muted">
                      ไม่ลบข้อมูลทิ้ง — ย้ายไปกลุ่ม “ศิษย์เก่า / ออกแล้ว” เก็บประวัติ เอกสาร และเงินเดือนไว้ครบ
                    </p>
                  </div>
                </div>
              </div>
            )}

            {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2 mt-4">{err}</p>}
          </div>
        </div>
      )}

      {/* ยืนยันชั้นที่สอง */}
      {confirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => !busy && setConfirm(null)} />
          <div className="relative card p-6 w-full max-w-sm text-center">
            <p className="font-medium mb-5">{confirm.label}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => confirm.run()} disabled={busy} className="btn-brand">
                <Icon name="Check" className="size-4" /> {busy ? "กำลังทำ…" : "ยืนยัน"}
              </button>
              <button onClick={() => setConfirm(null)} disabled={busy} className="btn-outline">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
