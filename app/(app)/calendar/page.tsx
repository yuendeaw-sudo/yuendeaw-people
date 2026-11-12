import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { CompanyCalendar } from "@/components/leave/CompanyCalendar";
import { LeavePolicyGuide } from "@/components/leave/LeavePolicyGuide";
import { bangkokDate, type CalendarLeave } from "@/lib/company-calendar";

export default async function CalendarPage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  // Always self-scoped, including owners/HR. Never send reasons or evidence to this client.
  const { data, error } = ctx.employeeId ? await supabase.from("leave_requests")
    .select("id, start_date, end_date, total_days, status, leave_types!inner(name, key)")
    .eq("employee_id", ctx.employeeId)
    .not("leave_types.key", "in", "(onsite,event)")
    .order("start_date", { ascending: false }) : { data: [], error: null };
  const requests: CalendarLeave[] = (data ?? []).map(row => {
    const lt = row.leave_types as unknown as { key: string; name: string };
    return { id: row.id, start_date: row.start_date, end_date: row.end_date, total_days: row.total_days, status: row.status, key: lt.key, name: lt.name };
  });
  return <div className="space-y-5">
    <PageHeader title="ปฏิทิน & วันหยุด" icon="CalendarDays" subtitle="ดูวันหยุดบริษัท บันทึกการลา และวางแผนเวลาของคุณ" />
    <CompanyCalendar requests={requests} today={bangkokDate()} hasEmployee={!!ctx.employeeId} loadError={!!error} />
    <div id="leave-policy" className="scroll-mt-20"><LeavePolicyGuide /></div>
  </div>;
}
