"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { compressImage } from "@/lib/image";
import type { LeaveLimits } from "@/lib/leave";

type LeaveType = { id: string; name: string; key?: string; requires_evidence?: boolean };

function daysBetween(a: string, b: string) {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return isNaN(d) ? 1 : Math.max(1, Math.round(d) + 1);
}

export function LeaveRequestForm({
  leaveTypes,
  employeeId,
  limits,
}: {
  leaveTypes: LeaveType[];
  employeeId: string;
  limits?: LeaveLimits | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = leaveTypes.find((t) => t.id === typeId);
  const needsEvidence = !!selected?.requires_evidence;
  const selKey = selected?.key;
  const annualBlocked = selKey === "annual" && !!limits?.annual.locked;
  const remaining =
    selKey === "annual" ? limits?.annual.left : selKey === "personal" ? limits?.personal.left : null;

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return setFile(null);
    if (f.size > 10 * 1024 * 1024) return setError("ไฟล์ใหญ่เกิน 10MB");
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(f.type))
      return setError("รองรับเฉพาะรูปภาพ (PNG/JPG) หรือ PDF");
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // quota guard
    const totalPre = halfDay ? 0.5 : daysBetween(start, end || start);
    if (selKey === "annual") {
      if (limits?.annual.locked) {
        setError(`คุณยังไม่มีสิทธิ์ลาพักร้อน — ต้องอยู่กับเราครบ 1 ปีก่อน (อีก ${limits.annual.monthsToUnlock} เดือน)`);
        return;
      }
      if (limits && totalPre > limits.annual.left) {
        setError(`วันลาพักร้อนคงเหลือไม่พอ — เหลือ ${limits.annual.left} วัน`);
        return;
      }
    }
    if (selKey === "personal" && limits && totalPre > limits.personal.left) {
      setError(`วันลากิจคงเหลือไม่พอ — เหลือ ${limits.personal.left} วัน (ขอ ${totalPre} วัน)`);
      return;
    }

    setLoading(true);

    // upload evidence first (if any)
    let evidencePath: string | null = null;
    if (file) {
      const compressed = await compressImage(file, { maxDim: 2200, quality: 0.82 });
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/leave/evidence", { method: "POST", body: fd });
      if (!res.ok) {
        setError(await res.text().catch(() => "อัปโหลดไฟล์ไม่สำเร็จ"));
        setLoading(false);
        return;
      }
      evidencePath = (await res.json()).path;
    }

    const total = halfDay ? 0.5 : daysBetween(start, end || start);
    const { error } = await createClient().from("leave_requests").insert({
      employee_id: employeeId,
      leave_type_id: typeId,
      start_date: start,
      end_date: end || start,
      is_half_day: halfDay,
      total_days: total,
      reason,
      evidence_path: evidencePath,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setOpen(false);
    setStart(""); setEnd(""); setReason(""); setFile(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="CalendarPlus" className="size-4" /> ขอลา
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">ขอลางาน</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">ประเภทการลา</label>
            <select className="input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {annualBlocked ? (
              <div className="mt-1.5 rounded-xl bg-rose-soft text-rose text-sm px-3 py-2 flex items-center gap-2">
                <Icon name="Lock" className="size-4 shrink-0" />
                คุณยังไม่มีสิทธิ์ลาพักร้อน — ต้องอยู่กับเราครบ 1 ปี (อีก {limits?.annual.monthsToUnlock} เดือน)
              </div>
            ) : remaining != null ? (
              <p className="mt-1.5 text-xs text-muted">คงเหลือ <b className="text-ink">{remaining}</b> วันในปีนี้</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เริ่ม</label>
              <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="label">ถึงวันที่</label>
              <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} disabled={halfDay} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} />
            ลาครึ่งวัน (นับ 0.5 วัน)
          </label>
          <div>
            <label className="label">เหตุผล</label>
            <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {/* evidence upload — shown for sick / emergency */}
          {needsEvidence && (
            <div>
              <label className="label">แนบใบรับรองแพทย์ / หลักฐาน {selected?.key === "sick" && <span className="text-muted font-normal">(แนะนำเมื่อลา 3 วันขึ้นไป)</span>}</label>
              {file ? (
                <div className="flex items-center gap-2 rounded-xl border border-sand bg-sand/40 px-3 py-2.5">
                  <Icon name="FileCheck" className="size-5 text-mint shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-muted hover:text-rose">
                    <Icon name="X" className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
                  className={`cursor-pointer rounded-xl2 border-2 border-dashed px-4 py-6 text-center transition ${dragOver ? "border-brand bg-brand-soft" : "border-sand bg-sand/20 hover:bg-sand/40"}`}
                >
                  <Icon name="UploadCloud" className="size-7 text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
                  <p className="text-xs text-muted mt-0.5">รูปภาพ หรือ PDF (ไม่เกิน 10MB)</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading || annualBlocked} className="btn-brand w-full">
            {loading ? "กำลังส่ง…" : annualBlocked ? "ยังลาพักร้อนไม่ได้" : "ส่งคำขอ"}
          </button>
        </div>
      </form>
    </div>
  );
}
