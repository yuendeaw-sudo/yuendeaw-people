import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, statusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { LeaveRequestForm } from "@/components/leave/LeaveRequestForm";
import { SpecialLeaveForm } from "@/components/leave/SpecialLeaveForm";
import { ConfirmLeaveRow } from "@/components/leave/ConfirmLeaveRow";
import { ApprovalRow } from "@/components/leave/ApprovalRow";
import { LeaveBalances } from "@/components/leave/LeaveBalances";
import { WorkArrangement } from "@/components/leave/WorkArrangement";
import { LeavePolicyGuide } from "@/components/leave/LeavePolicyGuide";
import { computeLeaveLimits, type LeaveLimits } from "@/lib/leave";
import { getLeaveTypes } from "@/lib/reference";

// leave types shown in the "ขอลา" form.
// (WFH/on-site/event are NOT leave; "unpaid"/LWOP is a special case handled via HR, not self-service)
const LEAVE_KEYS = ["sick", "personal", "annual", "emergency"];

export default async function TimeLeavePage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  const canApprove = can(ctx, "time_leave", "approve") || can(ctx, "time_leave", "view");
  const canKeySpecial = ctx.isOwner || can(ctx, "time_leave", "create");

  // The four blocks are independent → fetch them concurrently instead of in series.
  async function loadLeaveTypes() {
    const all = await getLeaveTypes(); // cached reference data
    return all
      .filter((t) => t.is_active && LEAVE_KEYS.includes(t.key as any))
      .map((t) => ({ id: t.id, key: t.key, name: t.name, requires_evidence: t.requires_evidence }));
  }

  async function loadPersonal() {
    if (!ctx.employeeId) return { myRequests: [] as any[], empInfo: null as any, limits: null as LeaveLimits | null };
    const [{ data: reqs }, { data: emp }] = await Promise.all([
      supabase
        .from("leave_requests")
        .select("id, start_date, end_date, total_days, status, reason, hr_comment, evidence_path, leave_types(name, key)")
        .eq("employee_id", ctx.employeeId)
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("start_date, employment_types(key)").eq("id", ctx.employeeId).maybeSingle(),
    ]);
    const limits = await computeLeaveLimits(
      supabase,
      ctx.employeeId,
      (emp as any)?.start_date,
      (emp as any)?.employment_types?.key ?? "full_time"
    );
    return {
      myRequests: (reqs ?? []).filter((r: any) => !["wfh", "onsite", "event"].includes(r.leave_types?.key)),
      empInfo: emp,
      limits,
    };
  }

  async function loadPending() {
    if (!canApprove) return [] as any[];
    const { data } = await supabase
      .from("leave_requests")
      .select(
        "id, employee_id, start_date, end_date, total_days, reason, evidence_path, leave_types(name), employees!leave_requests_employee_id_fkey(first_name, nickname)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    return (data ?? []).filter((r: any) => r.employees);
  }

  async function loadSpecial() {
    if (!canKeySpecial) return { spEmployees: [] as { id: string; name: string }[], spLeaveTypes: [] as any[] };
    const [{ data: emps }, allTypes] = await Promise.all([
      supabase.from("employees").select("id, first_name, nickname").order("first_name"),
      getLeaveTypes(), // cached
    ]);
    return {
      spEmployees: (emps ?? []).map((e: any) => ({ id: e.id, name: e.nickname || e.first_name })),
      spLeaveTypes: allTypes.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, key: t.key })),
    };
  }

  const [leaveTypes, personal, pending, special] = await Promise.all([
    loadLeaveTypes(),
    loadPersonal(),
    loadPending(),
    loadSpecial(),
  ]);
  const { myRequests, empInfo, limits } = personal;
  const { spEmployees, spLeaveTypes } = special;

  const myConfirm = myRequests.filter((r: any) => r.status === "awaiting_confirm");
  const history = myRequests.filter((r: any) => r.status !== "awaiting_confirm");

  return (
    <div className="space-y-6">
      <PageHeader
        title="เวลา & การลา"
        icon="CalendarClock"
        subtitle="ดูวันลาคงเหลือ ขอลา และแจ้งทำงานนอกออฟฟิศ"
        action={
          <div className="flex flex-wrap gap-2">
            {canKeySpecial && <SpecialLeaveForm employees={spEmployees} leaveTypes={spLeaveTypes} />}
            {ctx.employeeId && <LeaveRequestForm leaveTypes={leaveTypes ?? []} employeeId={ctx.employeeId} limits={limits} />}
          </div>
        }
      />

      {/* leave balance dashboard */}
      {ctx.employeeId && (
        <LeaveBalances
          employeeId={ctx.employeeId}
          startDate={empInfo?.start_date}
          employmentTypeKey={(empInfo as any)?.employment_types?.key ?? "full_time"}
        />
      )}

      {/* work-from-home / on-site (not leave) */}
      {ctx.employeeId && <WorkArrangement employeeId={ctx.employeeId} />}

      {/* approvals */}
      {canApprove && (
        <Card>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            รออนุมัติ
            {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}
          </h2>
          {pending.length ? (
            <div className="space-y-2">
              {pending.map((r) => (
                <ApprovalRow key={r.id} req={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">ไม่มีคำขอที่รออนุมัติ 🎉</p>
          )}
        </Card>
      )}

      {/* HR-keyed special leave waiting for the employee to confirm */}
      {myConfirm.length > 0 && (
        <Card className="border-amber-soft">
          <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
            <Icon name="BellRing" className="size-4 text-amber" /> รอคุณยืนยัน
            <Badge tone="amber">{myConfirm.length}</Badge>
          </h2>
          <p className="text-sm text-muted mb-4">HR/หัวหน้าคีย์การลาให้หลังตกลงกันแล้ว — ตรวจแล้วกดยืนยัน</p>
          <div className="space-y-2">
            {myConfirm.map((r: any) => (
              <ConfirmLeaveRow key={r.id} req={r} />
            ))}
          </div>
        </Card>
      )}

      {/* my leave history / log */}
      <Card>
        <h2 className="font-semibold text-base mb-4">ประวัติการลาของฉัน</h2>
        {history.length ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-2 py-2 font-medium">ประเภท</th>
                  <th className="px-2 py-2 font-medium">ช่วงวันที่</th>
                  <th className="px-2 py-2 font-medium">วัน</th>
                  <th className="px-2 py-2 font-medium">เหตุผล</th>
                  <th className="px-2 py-2 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const sb = statusBadge(r.status);
                  return (
                    <tr key={r.id} className="border-t border-sand/70">
                      <td className="px-2 py-3 font-medium">{r.leave_types?.name}</td>
                      <td className="px-2 py-3 text-muted">
                        {formatThaiDate(r.start_date)}
                        {r.end_date !== r.start_date && ` – ${formatThaiDate(r.end_date)}`}
                      </td>
                      <td className="px-2 py-3">{r.total_days}</td>
                      <td className="px-2 py-3 text-muted max-w-[200px]">
                        <div className="truncate">{r.reason || "—"}</div>
                        {r.evidence_path && (
                          <a
                            href={`/api/leave/evidence/view?path=${encodeURIComponent(r.evidence_path)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs text-gold hover:underline mt-0.5"
                          >
                            <Icon name="Paperclip" className="size-3" /> ใบรับรองแพทย์
                          </a>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <Badge tone={sb.tone}>{sb.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="CalendarPlus" title="ยังไม่มีประวัติการลา" subtitle="กดปุ่ม 'ขอลา' ด้านบนเพื่อเริ่ม" />
        )}
      </Card>

      {/* policy details (secondary, collapsible) */}
      <LeavePolicyGuide />
    </div>
  );
}
