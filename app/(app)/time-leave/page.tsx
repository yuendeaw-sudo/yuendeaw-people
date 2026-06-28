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
import { OvertimeCard } from "@/components/leave/OvertimeCard";
import { OTApprovals } from "@/components/leave/OTApprovals";
import { CompDayOffCard } from "@/components/leave/CompDayOffCard";
import { CompDayOffGrant } from "@/components/leave/CompDayOffGrant";
import { LeavePolicyGuide } from "@/components/leave/LeavePolicyGuide";
import { computeLeaveLimits, type LeaveLimits } from "@/lib/leave";

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
    const { data } = await supabase
      .from("leave_types")
      .select("id, key, name, requires_evidence")
      .eq("is_active", true)
      .in("key", LEAVE_KEYS)
      .order("sort_order");
    return data ?? [];
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
    const [{ data: emps }, { data: allTypes }] = await Promise.all([
      supabase.from("employees").select("id, first_name, nickname").order("first_name"),
      supabase.from("leave_types").select("id, name, key").eq("is_active", true).order("sort_order"),
    ]);
    return {
      spEmployees: (emps ?? []).map((e: any) => ({ id: e.id, name: e.nickname || e.first_name })),
      spLeaveTypes: allTypes ?? [],
    };
  }

  // owner: ภาพรวมการลาของทีม (คนที่อนุมัติแล้ว ยังไม่จบ) — ไม่ใช่ WFH/ออกกอง
  async function loadTeamLeaves() {
    if (!ctx.isOwner) return { teamLeaves: [] as any[], onLeaveToday: [] as any[] };
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("leave_requests")
      .select(
        "id, start_date, end_date, total_days, leave_types(name, key), employees!leave_requests_employee_id_fkey(first_name, nickname)"
      )
      .eq("status", "approved")
      .gte("end_date", today)
      .order("start_date", { ascending: true })
      .limit(60);
    const teamLeaves = (data ?? []).filter(
      (r: any) => r.employees && !["wfh", "onsite", "event"].includes(r.leave_types?.key)
    );
    const onLeaveToday = teamLeaves.filter((r: any) => r.start_date <= today && r.end_date >= today);
    return { teamLeaves, onLeaveToday };
  }

  const [leaveTypes, personal, pending, special, team] = await Promise.all([
    loadLeaveTypes(),
    loadPersonal(),
    loadPending(),
    loadSpecial(),
    loadTeamLeaves(),
  ]);
  const { myRequests, empInfo, limits } = personal;
  const { spEmployees, spLeaveTypes } = special;
  const { teamLeaves, onLeaveToday } = team;

  const myConfirm = myRequests.filter((r: any) => r.status === "awaiting_confirm");
  const history = myRequests.filter((r: any) => r.status !== "awaiting_confirm");

  // ===========================================================================
  // OWNER VIEW — หน้าบริหารคน: อนุมัติ + ภาพรวมทีม + ให้สิทธิ์ (ไม่มีวันลา/OT ส่วนตัว)
  // ===========================================================================
  if (ctx.isOwner) {
    const today = new Date().toISOString().slice(0, 10);
    return (
      <div className="space-y-6">
        <PageHeader
          title="เวลา & การลา"
          icon="CalendarClock"
          subtitle="บริหารวันลา OT และเวลาทำงานของทีม"
          action={
            <div className="flex flex-wrap gap-2">
              <CompDayOffGrant employees={spEmployees} />
              <SpecialLeaveForm employees={spEmployees} leaveTypes={spLeaveTypes} />
            </div>
          }
        />

        {/* สรุปสั้น ๆ ให้เห็นภาพทีม */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name="Inbox" className="size-4 text-amber" /> รออนุมัติการลา
            </div>
            <div className="text-3xl font-extrabold mt-1">{pending.length}</div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name="Palmtree" className="size-4 text-mint" /> ทีมลาวันนี้
            </div>
            <div className="text-3xl font-extrabold mt-1">{onLeaveToday.length} <span className="text-base font-normal text-muted">คน</span></div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name="CalendarDays" className="size-4 text-grape" /> ลาที่อนุมัติล่วงหน้า
            </div>
            <div className="text-3xl font-extrabold mt-1">{teamLeaves.length} <span className="text-base font-normal text-muted">รายการ</span></div>
          </Card>
        </div>

        <p className="text-xs text-muted -mt-2 flex items-center gap-1.5">
          <Icon name="Crown" className="size-3.5 text-gold" />
          ในฐานะเจ้าของ คุณลาได้ตามต้องการ — หน้านี้จึงเน้นดูแลการลา/OT ของทีม
        </p>

        {/* OT รออนุมัติ */}
        <OTApprovals />

        {/* การลารออนุมัติ */}
        <Card>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            การลารออนุมัติ
            {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}
          </h2>
          {pending.length ? (
            <div className="space-y-2">
              {pending.map((r) => (
                <ApprovalRow key={r.id} req={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">ไม่มีคำขอลาที่รออนุมัติ 🎉</p>
          )}
        </Card>

        {/* ภาพรวมการลาของทีม */}
        <Card>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Icon name="Users" className="size-4 text-gold" /> ใครลาช่วงนี้บ้าง
          </h2>
          {teamLeaves.length ? (
            <div className="space-y-2">
              {teamLeaves.map((r: any) => {
                const active = r.start_date <= today && r.end_date >= today;
                const emp = r.employees;
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">{emp?.nickname || emp?.first_name}</span>
                      <span className="text-muted"> · {r.leave_types?.name}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {formatThaiDate(r.start_date)}
                      {r.end_date !== r.start_date && ` – ${formatThaiDate(r.end_date)}`} · {r.total_days} วัน
                    </span>
                    {active && <Badge tone="mint">ลาอยู่</Badge>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">ช่วงนี้ไม่มีใครลา 🎉</p>
          )}
        </Card>

        {/* policy details (secondary, collapsible) */}
        <LeavePolicyGuide />
      </div>
    );
  }

  // ===========================================================================
  // EMPLOYEE VIEW — วันลา/OT ส่วนตัว + อนุมัติ (ถ้ามีสิทธิ์)
  // ===========================================================================
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

      {/* OT (ทำงานล่วงเวลา) — ต่อจากการ์ดทำงานนอกสถานที่ */}
      {ctx.employeeId && <OvertimeCard employeeId={ctx.employeeId} />}

      {/* วันหยุดสะสมจากการทุ่มเท (โชว์เมื่อมี) */}
      {ctx.employeeId && <CompDayOffCard employeeId={ctx.employeeId} />}

      {/* OT รออนุมัติ (ผู้อนุมัติเห็น) */}
      {(ctx.isOwner || can(ctx, "time_leave", "approve")) && <OTApprovals />}

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
