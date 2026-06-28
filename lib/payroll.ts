// Monthly payroll roll-up: pay (salary + intern stipend) − social security / withholding tax.
// Reads sensitive comp data — callers must already be gated by sensitive_view/finance.

import { stipendDays, stipendAmount, DEFAULT_STIPEND } from "@/lib/intern";

// ประกันสังคม ม.33: 5% ของฐานค่าจ้าง ฐานต่ำสุด 1,650 เพดาน 17,500/เดือน
export const SSO_RATE = 0.05;
export const SSO_FLOOR = 1650;
export const SSO_CEIL = 17500;
export const WHT_RATE = 0.03; // หัก ณ ที่จ่าย 3%

export function computeSSO(salary?: number | null): number {
  if (!salary || salary <= 0) return 0;
  return Math.round(Math.min(Math.max(salary, SSO_FLOOR), SSO_CEIL) * SSO_RATE);
}

export type PayrollRow = {
  employeeId: string;
  code: string | null;
  name: string;
  type: string | null;
  status: string;
  pay: number; // เงินเดือน + เบี้ยฝึก (รวมในช่องเดียว)
  bonus: number;
  welfare: number;
  sso: number; // หักประกันสังคม
  wht: number; // หัก ณ ที่จ่าย
  net: number; // ยอดสุทธิ (หลังหัก)
};

export async function computePayroll(supabase: any, year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const todayYmd = new Date().toISOString().slice(0, 10);

  const [{ data: emps }, { data: comp }, { data: bonus }, { data: welfare }, { data: internLogs }] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "id, employee_code, first_name, last_name, nickname, status, social_security, stipend_start_date, stipend_daily_rate, employment_types(name, key)"
      )
      .in("status", ["active", "probation", "intern", "freelance"])
      .order("employee_code"),
    supabase.from("employee_compensation").select("employee_id, amount, effective_date").order("effective_date", { ascending: false }),
    supabase.from("bonus_requests").select("employee_id, amount, unit, status, created_at").in("status", ["approved", "paid"]),
    supabase.from("welfare_payments").select("employee_id, amount, paid_on"),
    supabase.from("intern_logs").select("intern_id, log_date").gte("log_date", start).lte("log_date", end),
  ]);

  const latestComp: Record<string, number> = {};
  for (const c of comp ?? []) {
    if (!(c.employee_id in latestComp)) latestComp[c.employee_id] = Number(c.amount || 0);
  }
  const logsByIntern: Record<string, string[]> = {};
  for (const l of internLogs ?? []) (logsByIntern[l.intern_id] ??= []).push(l.log_date);

  const sumBy = (rows: any[], pred: (r: any) => boolean) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) if (pred(r)) m[r.employee_id] = (m[r.employee_id] ?? 0) + Number(r.amount || 0);
    return m;
  };
  const bonusM = sumBy(bonus ?? [], (b) => (b.unit ?? "baht") === "baht" && b.created_at >= start && b.created_at <= `${end}T23:59:59`);
  const welfareM = sumBy(welfare ?? [], (w) => w.paid_on && w.paid_on >= start && w.paid_on <= end);

  const rows: PayrollRow[] = (emps ?? []).map((e: any) => {
    const isIntern = e.employment_types?.key === "intern";
    const salary = isIntern ? 0 : latestComp[e.id] ?? 0; // เด็กฝึกไม่มีเงินเดือน มีแค่เบี้ย
    const days = stipendDays(logsByIntern[e.id] ?? [], e.stipend_start_date ?? null, todayYmd, start, end);
    const stipend = stipendAmount(days, Number(e.stipend_daily_rate) || DEFAULT_STIPEND);
    const pay = salary + stipend;

    // ประกันสังคมเฉพาะพนักงานที่ขึ้นสิทธิ์ (เด็กฝึกไม่มี) → หัก 5%
    const hasSSO = !isIntern && (e.social_security ?? "enrolled") === "enrolled";
    const sso = hasSSO ? computeSSO(salary) : 0;
    // ไม่มีประกันสังคม + เด็กฝึกงาน → หัก ณ ที่จ่าย 3% ของรายได้
    const wht = hasSSO ? 0 : Math.round(pay * WHT_RATE);

    const bonusV = bonusM[e.id] ?? 0;
    const welfareV = welfareM[e.id] ?? 0;
    return {
      employeeId: e.id,
      code: e.employee_code,
      name: `${e.first_name}${e.last_name ? " " + e.last_name : ""}${e.nickname ? ` (${e.nickname})` : ""}`,
      type: e.employment_types?.name ?? null,
      status: e.status,
      pay,
      bonus: bonusV,
      welfare: welfareV,
      sso,
      wht,
      net: pay + bonusV + welfareV - sso - wht,
    };
  });

  const total = rows.reduce((s, r) => s + r.net, 0);
  return { rows, total, period: `${mm}/${year}` };
}
