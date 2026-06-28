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

/** นับวันที่จ่ายเบี้ย = log ที่ลงวันที่ >= วันเริ่มนับ (และอยู่ในช่วง from..to ถ้าระบุ) */
export function paidDays(
  logDates: string[],
  stipendStart: string | null,
  fromYmd?: string,
  toYmd?: string
): number {
  if (!stipendStart) return 0; // ยังไม่ผ่านประเมิน → ไม่มีเบี้ย
  return logDates.filter((d) => {
    if (d < stipendStart) return false;
    if (fromYmd && d < fromYmd) return false;
    if (toYmd && d > toYmd) return false;
    return true;
  }).length;
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
