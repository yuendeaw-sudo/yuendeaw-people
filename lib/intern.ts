// Internship stipend helpers — เบี้ยฝึกนับเฉพาะวันที่มี log ตั้งแต่วันผ่านประเมิน

export const DEFAULT_STIPEND = 200;

/** วันเริ่มงาน + 1 เดือน = กำหนดประเมิน (ค่าเริ่มต้น) */
export function evalDueFromStart(startDate?: string | null): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// ตั้งแต่วันนี้เป็นต้นไปต้องเขียน log วันนั้นจึงนับเบี้ย; ก่อนหน้านี้นับวันทำงาน (จ-ศ) อัตโนมัติ
export const LOG_REQUIRED_FROM = "2026-06-29";

function ymdToUTC(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}
function isWeekdayYmd(ymd: string): boolean {
  const wd = new Date(ymdToUTC(ymd)).getUTCDay();
  return wd >= 1 && wd <= 5; // จันทร์–ศุกร์ (หยุดเสาร์-อาทิตย์)
}

/**
 * นับวันจ่ายเบี้ยฝึก — เฉพาะวันทำงาน จันทร์–ศุกร์ ตั้งแต่ stipendStart ถึง todayYmd
 * (จำกัดช่วง from..to ได้). ก่อน LOG_REQUIRED_FROM นับวันทำงานอัตโนมัติ;
 * ตั้งแต่ LOG_REQUIRED_FROM เป็นต้นไป ต้องมี log วันนั้นจึงนับ.
 */
export function stipendDays(
  logDates: string[],
  stipendStart: string | null,
  todayYmd: string,
  fromYmd?: string,
  toYmd?: string
): number {
  if (!stipendStart) return 0; // ยังไม่ผ่านประเมิน → ไม่มีเบี้ย
  const logSet = new Set(logDates);
  let start = stipendStart;
  if (fromYmd && fromYmd > start) start = fromYmd;
  let end = todayYmd;
  if (toYmd && toYmd < end) end = toYmd;
  if (start > end) return 0;

  let count = 0;
  for (let ms = ymdToUTC(start); ms <= ymdToUTC(end); ms += 86400000) {
    const ymd = new Date(ms).toISOString().slice(0, 10);
    if (!isWeekdayYmd(ymd)) continue; // นับเฉพาะ จ-ศ
    if (ymd < LOG_REQUIRED_FROM) count++; // นับอัตโนมัติ (ไม่ต้องมี log)
    else if (logSet.has(ymd)) count++; // ต้องมี log วันนั้น
  }
  return count;
}

export function stipendAmount(days: number, rate?: number | null): number {
  return days * (Number(rate) || DEFAULT_STIPEND);
}

// ---------------------------------------------------------------------------
// ลำดับขั้นการประเมิน 2 ชั้น: พี่เลี้ยง(หัวหน้า)ประเมินก่อน → เจ้าของอนุมัติขั้นสุดท้าย
// เบี้ยเริ่มนับเมื่อเจ้าของอนุมัติ (stipend_start_date ถูกตั้ง)
// ---------------------------------------------------------------------------
export type InternStage = "pending" | "mentor_passed" | "passed" | "failed";

export const INTERN_STAGE_LABEL: Record<InternStage, string> = {
  pending: "รอพี่เลี้ยงประเมิน",
  mentor_passed: "พี่เลี้ยงผ่านแล้ว · รอเจ้าของอนุมัติ",
  passed: "ผ่านสมบูรณ์",
  failed: "ไม่ผ่าน",
};

export function internEvalState(opts: {
  stipendStart: string | null;
  managerId: string | null;
  evals: { evaluator_id: string | null; status: string }[];
  isOwner: boolean;
  isPeopleEdit: boolean;
  myEmployeeId: string | null;
}) {
  const finallyPassed = !!opts.stipendStart;
  const mentorPassed =
    !!opts.managerId && opts.evals.some((e) => e.evaluator_id === opts.managerId && e.status === "passed");
  const anyFailed = opts.evals.some((e) => e.status === "failed");
  const isFinalApprover = opts.isOwner || opts.isPeopleEdit;
  const iAmMentor = !!opts.managerId && opts.managerId === opts.myEmployeeId;

  let canEvaluate = false;
  let evalLabel = "ประเมินน้องฝึก";
  if (!finallyPassed) {
    if (isFinalApprover) {
      // เจ้าของ/HR อนุมัติได้เมื่อพี่เลี้ยงประเมินผ่านแล้ว (หรือตัวเองเป็นพี่เลี้ยง / ไม่มีพี่เลี้ยง)
      if (mentorPassed || iAmMentor || !opts.managerId) {
        canEvaluate = true;
        evalLabel = mentorPassed && !iAmMentor ? "อนุมัติขั้นสุดท้าย (เจ้าของ)" : "ประเมินน้องฝึก";
      }
    } else if (iAmMentor && !mentorPassed) {
      canEvaluate = true; // พี่เลี้ยงประเมินก่อน
    }
  }

  const stage: InternStage = finallyPassed
    ? "passed"
    : anyFailed && !mentorPassed
      ? "failed"
      : mentorPassed
        ? "mentor_passed"
        : "pending";

  return { finallyPassed, mentorPassed, stage, canEvaluate, evalLabel };
}
