import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { LeaveBalances } from "@/components/leave/LeaveBalances";

/** Self/owner/leave readers only; all queries also retain the session's RLS. */
export async function EmployeeLeaveSummary({
  employeeId,
  startDate,
  employmentTypeKey,
}: {
  employeeId: string;
  startDate?: string | null;
  employmentTypeKey?: string;
}) {
  const ctx = await getAccessContext();
  if (!ctx || !(ctx.employeeId === employeeId || can(ctx, "time_leave", "view"))) return null;

  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date()));
  const self = ctx.employeeId === employeeId;

  return (
    <section aria-label="สรุปและประวัติการลา" className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Icon name="CalendarDays" className="size-5 text-gold" /> วันลา ปี {year + 543}
        </h2>
        {self && <Link href="/time-leave" className="text-sm text-gold hover:underline">ไปหน้าเวลา &amp; การลา →</Link>}
      </div>
      <p className="text-xs text-muted">
        ยอดคงเหลือนับเฉพาะลาที่อนุมัติแล้ว รวมลาล่วงหน้า · รายการรออนุมัติ ไม่อนุมัติ และยกเลิกยังไม่หักยอด
        <br />นับตามวันเริ่มลาในปีนี้ ไม่รวม WFH และทำงานนอกสถานที่
      </p>
      {employmentTypeKey === "intern" ? (
        <Card><p className="text-sm text-muted">เด็กฝึกงานไม่มีโควตาวันลาแบบพนักงานประจำ ดูรายการลาที่บันทึกไว้ด้านล่าง</p></Card>
      ) : (
        <LeaveBalances employeeId={employeeId} startDate={startDate} employmentTypeKey={employmentTypeKey} />
      )}
      <LeaveHistory employeeId={employeeId} />
    </section>
  );
}

async function LeaveHistory({ employeeId }: { employeeId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leave_requests")
    .select("id, start_date, end_date, total_days, status, leave_types!inner(name, key)")
    .eq("employee_id", employeeId)
    .not("leave_types.key", "in", "(wfh,onsite,event)")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <Card>
      <h3 className="font-semibold">ประวัติการลา</h3>
      <p className="text-xs text-muted mt-1 mb-3">10 รายการล่าสุดตามวันเริ่มลา รวมทุกปีและลาล่วงหน้า</p>
      {error ? (
        <p role="alert" className="text-sm text-rose">ไม่สามารถโหลดประวัติการลาได้ กรุณาลองใหม่อีกครั้ง</p>
      ) : data?.length ? (
        <ul className="divide-y divide-sand">
          {data.map((request) => {
            const badge = statusBadge(request.status);
            // The untyped Supabase client infers a to-many relation; this FK is to-one.
            const leaveType = request.leave_types as unknown as { name: string; key: string };
            return (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold">{leaveType.name} · {request.total_days} วัน</div>
                  <div className="text-xs text-muted mt-1">
                    {formatThaiDate(request.start_date)}
                    {request.end_date !== request.start_date && ` – ${formatThaiDate(request.end_date)}`}
                  </div>
                </div>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted">ยังไม่มีประวัติการลาในระบบ</p>}
    </Card>
  );
}
