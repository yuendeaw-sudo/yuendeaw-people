// Monthly payroll roll-up: latest salary + intern stipend + this-month bonus + welfare.
// Reads sensitive comp data — callers must already be gated by sensitive_view/finance.

import { paidDays, stipendAmount, DEFAULT_STIPEND } from "@/lib/intern";

export type PayrollRow = {
  employeeId: string;
  code: string | null;
  name: string;
  type: string | null;
  status: string;
  salary: number;
  stipend: number; // เบี้ยฝึกงานเดือนนี้
  bonus: number;
  welfare: number;
  net: number;
};

export async function computePayroll(supabase: any, year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: emps }, { data: comp }, { data: bonus }, { data: welfare }, { data: internLogs }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, employee_code, first_name, last_name, nickname, status, stipend_start_date, stipend_daily_rate, employment_types(name)")
      .in("status", ["active", "probation", "intern", "freelance"])
      .order("employee_code"),
    supabase.from("employee_compensation").select("employee_id, amount, effective_date").order("effective_date", { ascending: false }),
    supabase.from("bonus_requests").select("employee_id, amount, unit, status, created_at").in("status", ["approved", "paid"]),
    supabase.from("welfare_payments").select("employee_id, amount, paid_on"),
    supabase.from("intern_logs").select("intern_id, log_date").gte("log_date", start).lte("log_date", end),
  ]);

  // latest comp per employee
  const latestComp: Record<string, number> = {};
  for (const c of comp ?? []) {
    if (!(c.employee_id in latestComp)) latestComp[c.employee_id] = Number(c.amount || 0);
  }
  // intern log dates this month, grouped per intern
  const logsByIntern: Record<string, string[]> = {};
  for (const l of internLogs ?? []) (logsByIntern[l.intern_id] ??= []).push(l.log_date);

  const sumBy = (rows: any[], pred: (r: any) => boolean) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) if (pred(r)) m[r.employee_id] = (m[r.employee_id] ?? 0) + Number(r.amount || 0);
    return m;
  };
  // นับเฉพาะโบนัสที่เป็น "เงินบาท" (ไม่รวม % / วัน)
  const bonusM = sumBy(bonus ?? [], (b) => (b.unit ?? "baht") === "baht" && b.created_at >= start && b.created_at <= `${end}T23:59:59`);
  const welfareM = sumBy(welfare ?? [], (w) => w.paid_on && w.paid_on >= start && w.paid_on <= end);

  const rows: PayrollRow[] = (emps ?? []).map((e: any) => {
    const salary = latestComp[e.id] ?? 0;
    const days = paidDays(logsByIntern[e.id] ?? [], e.stipend_start_date ?? null, start, end);
    const stipend = stipendAmount(days, Number(e.stipend_daily_rate) || DEFAULT_STIPEND);
    const bonusV = bonusM[e.id] ?? 0;
    const welfareV = welfareM[e.id] ?? 0;
    return {
      employeeId: e.id,
      code: e.employee_code,
      name: `${e.first_name}${e.last_name ? " " + e.last_name : ""}${e.nickname ? ` (${e.nickname})` : ""}`,
      type: e.employment_types?.name ?? null,
      status: e.status,
      salary,
      stipend,
      bonus: bonusV,
      welfare: welfareV,
      net: salary + stipend + bonusV + welfareV,
    };
  });

  const total = rows.reduce((s, r) => s + r.net, 0);
  return { rows, total, period: `${mm}/${year}` };
}
