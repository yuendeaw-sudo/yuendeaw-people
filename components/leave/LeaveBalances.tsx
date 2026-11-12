import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { bangkokDate } from "@/lib/company-calendar";
import { tenureMonths, annualEntitlement } from "@/lib/leave";

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
  const today = bangkokDate();
  const year = Number(today.slice(0, 4));

  const [{ data: policies, error: policyError }, { data: reqs, error: requestError }] = await Promise.all([
    supabase
      .from("leave_policies")
      .select("annual_quota_days, rules, leave_types(key), employment_types(key)")
      .order("created_at"),
    supabase
      .from("leave_requests")
      .select("total_days, status, start_date, leave_types(key)")
      .eq("employee_id", employeeId)
      .in("status", ["approved", "pending"])
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`),
  ]);

  if (policyError || requestError) {
    return <Card><p role="alert" className="text-sm text-rose">ไม่สามารถโหลดสรุปวันลาได้ กรุณาลองใหม่อีกครั้ง</p></Card>;
  }

  const policyFor = (key: string) =>
    (policies ?? []).find((p: any) => p.leave_types?.key === key && p.employment_types?.key === employmentTypeKey) ??
    (policies ?? []).find((p: any) => p.leave_types?.key === key && !p.employment_types) ??
    (policies ?? []).find((p: any) => p.leave_types?.key === key && p.employment_types?.key === "full_time");

  const daysOf = (key: string, state: "started" | "planned" | "pending") =>
    (reqs ?? []).filter((r: any) => r.leave_types?.key === key &&
      (state === "pending" ? r.status === "pending" : r.status === "approved" &&
        (state === "planned" ? r.start_date > today : r.start_date <= today)))
      .reduce((s: number, r: any) => s + Number(r.total_days || 0), 0);
  const usedOf = (key: string) => daysOf(key, "started");
  const bookedOf = (key: string) => daysOf(key, "started") + daysOf(key, "planned");

  const months = tenureMonths(startDate);
  const years = Math.floor(months / 12);

  // annual
  const annualPolicy: any = policyFor("annual");
  const tiers = annualPolicy?.rules?.tiers ?? [{ years: 1, days: annualPolicy?.annual_quota_days ?? 6 }];
  const annualLocked = years < 1;
  const annualEntitled = annualEntitlement(tiers, years);
  const annualUsed = usedOf("annual");
  const annualLeft = Math.max(0, annualEntitled - bookedOf("annual"));

  // personal
  const personalEntitled = Number(policyFor("personal")?.annual_quota_days ?? 3);
  const personalUsed = usedOf("personal");
  const personalLeft = Math.max(0, personalEntitled - bookedOf("personal"));

  // sick
  const sickUsed = usedOf("sick");
  const sickCap = Number(policyFor("sick")?.annual_quota_days ?? 30);

  return (
    <section aria-label={`บันทึกการลา ปี ${year + 543}`} className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { key: "sick", name: "ลาป่วย", days: sickUsed },
          { key: "personal", name: "ลากิจ", days: personalUsed },
          { key: "annual", name: "พักร้อน", days: annualUsed },
        ].map(item => <Card key={item.key} className="!p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{item.name}</h3><Badge tone="sand">ปี {year + 543}</Badge></div>
          <p className="mt-2 text-2xl font-bold">{item.days} <span className="text-sm font-normal text-muted">วัน · ลาที่เริ่มแล้ว</span></p>
          {daysOf(item.key, "planned") > 0 && <p className="text-xs text-muted mt-2">อนุมัติล่วงหน้า {daysOf(item.key, "planned")} วัน แสดงแยกจากประวัติ</p>}
          {daysOf(item.key, "pending") > 0 && <p className="text-xs text-muted mt-1">รออนุมัติ {daysOf(item.key, "pending")} วัน</p>}
        </Card>)}
      </div>
      <p className="text-xs text-muted">นับเฉพาะลาที่อนุมัติและเริ่มลาแล้ว รวมรายการที่กำลังลา ตามจำนวนวันที่บันทึกไว้และปีที่เริ่มลา</p>
      <Card className="!p-4">
        <details>
          <summary className="cursor-pointer font-medium text-sm">สิทธิและข้อมูลสำหรับวางแผนการลา</summary>
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>วันหยุดบริษัทแยกจากสิทธิพักร้อน เลือกวางแผนตามความจำเป็นและประสานการส่งต่องานกับหัวหน้า</p>
            {annualLocked ? <p>สิทธิพักร้อนปัจจุบันเริ่มเมื่อทำงานครบ 1 ปี · อายุงาน {months} เดือน หากต้องการหยุดก่อนครบปี ให้ปรึกษา HR</p> : <p>พักร้อนตามอายุงาน {years} ปี: {annualEntitled} วัน/ปี · อนุมัติแล้ว {bookedOf("annual")} วัน · วางแผนเพิ่มได้ {Math.max(0, annualLeft - daysOf("annual", "pending"))} วัน หลังกันรายการรออนุมัติ</p>}
            <p>ลากิจธุระจำเป็น: {personalEntitled} วัน/ปี · อนุมัติแล้ว {bookedOf("personal")} วัน · วางแผนเพิ่มได้ {Math.max(0, personalLeft - daysOf("personal", "pending"))} วัน หลังกันรายการรออนุมัติ</p>
            <p>ลาป่วยได้เท่าที่ป่วยจริง · รับค่าจ้างไม่เกิน {sickCap} วันทำงาน/ปี ตัวเลขนี้เป็นกรอบการจ่ายค่าจ้าง ไม่ใช่จำนวนวันที่ต้องใช้</p>
          </div>
        </details>
      </Card>
    </section>
  );
}
