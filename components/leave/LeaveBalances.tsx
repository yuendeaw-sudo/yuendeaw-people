import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * Per-employee leave balance dashboard. "used" counts ONLY approved requests
 * (pending/unapproved leave doesn't count). Annual leave unlocks after 1 year
 * and scales by tenure. Quotas/tiers come from leave_policies (HR-editable).
 */

function tenureMonths(start?: string | null) {
  if (!start) return 0;
  const s = new Date(start);
  if (isNaN(s.getTime())) return 0;
  const now = new Date();
  let m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() < s.getDate()) m -= 1;
  return Math.max(0, m);
}

function annualEntitlement(tiers: { years: number; days: number }[], years: number) {
  let days = 0;
  for (const t of (tiers ?? []).sort((a, b) => a.years - b.years)) {
    if (years >= t.years) days = t.days;
  }
  return days;
}

function Bar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="h-2.5 rounded-full bg-sand overflow-hidden mt-2">
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

export async function LeaveBalances({
  employeeId,
  startDate,
  employmentTypeKey = "full_time",
}: {
  employeeId: string;
  startDate?: string | null;
  employmentTypeKey?: string;
}) {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [{ data: policies }, { data: reqs }] = await Promise.all([
    supabase
      .from("leave_policies")
      .select("annual_quota_days, rules, leave_types(key), employment_types(key)")
      .order("created_at"),
    supabase
      .from("leave_requests")
      .select("total_days, status, start_date, leave_types(key)")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`),
  ]);

  const policyFor = (key: string) =>
    (policies ?? []).find((p: any) => {
      const et = p.employment_types?.key;
      return p.leave_types?.key === key && (!et || et === employmentTypeKey);
    }) ??
    (policies ?? []).find((p: any) => p.leave_types?.key === key && p.employment_types?.key === "full_time");

  const usedOf = (key: string) =>
    (reqs ?? [])
      .filter((r: any) => r.leave_types?.key === key)
      .reduce((s: number, r: any) => s + Number(r.total_days || 0), 0);

  const months = tenureMonths(startDate);
  const years = Math.floor(months / 12);

  // annual
  const annualPolicy: any = policyFor("annual");
  const tiers = annualPolicy?.rules?.tiers ?? [{ years: 1, days: annualPolicy?.annual_quota_days ?? 6 }];
  const annualLocked = years < 1;
  const annualEntitled = annualEntitlement(tiers, years);
  const annualUsed = usedOf("annual");
  const annualLeft = Math.max(0, annualEntitled - annualUsed);

  // personal
  const personalEntitled = Number(policyFor("personal")?.annual_quota_days ?? 3);
  const personalUsed = usedOf("personal");
  const personalLeft = Math.max(0, personalEntitled - personalUsed);

  // sick
  const sickUsed = usedOf("sick");
  const sickCap = Number(policyFor("sick")?.annual_quota_days ?? 30);

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {/* ลาพักร้อน */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base">ลาพักร้อน 🌴</span>
          <Badge tone="grape">ต้องอนุมัติ</Badge>
        </div>
        {annualLocked ? (
          <>
            <div className="mt-3 flex items-center gap-2 text-amber">
              <Icon name="Lock" className="size-5" />
              <span className="font-bold text-base">ยังไม่ปลดล็อก</span>
            </div>
            <p className="text-sm text-muted mt-1.5">
              สิทธิ์ลาพักร้อนเริ่มเมื่ออยู่ครบ 1 ปี — เหลืออีก {Math.max(0, 12 - months)} เดือน
            </p>
          </>
        ) : (
          <>
            <div className="mt-2 text-3xl font-extrabold">
              เหลือ {annualLeft}
              <span className="text-base font-normal text-muted"> / {annualEntitled} วัน</span>
            </div>
            <Bar used={annualUsed} total={annualEntitled} />
            <p className="text-sm text-muted mt-2">ใช้ไป {annualUsed} วัน · อยู่กับเรา {years} ปี</p>
          </>
        )}
      </Card>

      {/* ลากิจ */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base">ลากิจ</span>
          <Badge tone="grape">ต้องอนุมัติ</Badge>
        </div>
        <div className="mt-2 text-3xl font-extrabold">
          เหลือ {personalLeft}
          <span className="text-base font-normal text-muted"> / {personalEntitled} วัน</span>
        </div>
        <Bar used={personalUsed} total={personalEntitled} />
        <p className="text-sm text-muted mt-2">ใช้ไป {personalUsed} วัน · แจ้งหัวหน้าล่วงหน้า</p>
      </Card>

      {/* ลาป่วย — framed as a right, not a target */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base">ลาป่วย</span>
          <Badge tone="sand">ตามจำเป็น</Badge>
        </div>
        <div className="mt-2 text-3xl font-extrabold">
          {sickUsed} <span className="text-base font-normal text-muted">วันปีนี้</span>
        </div>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          ป่วยจริงลาได้ — แจ้งหัวหน้า แนบใบรับรองแพทย์ถ้าลายาว 3 วันขึ้นไป
          <br />
          <span className="text-xs">(ได้รับค่าจ้างไม่เกิน {sickCap} วัน/ปี)</span>
        </p>
      </Card>
    </div>
  );
}
