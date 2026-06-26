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
