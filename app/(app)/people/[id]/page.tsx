import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, Badge, statusBadge, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EmployeeTabs } from "@/components/people/EmployeeTabs";
import { QuestEvidence } from "@/components/quests/QuestEvidence";
import { InviteButton } from "@/components/people/InviteButton";
import { EmployeeStatusActions } from "@/components/people/EmployeeStatusActions";
import { JobDescriptionCard } from "@/components/people/JobDescriptionCard";
import { stipendDays, stipendAmount, evalDueFromStart, internEvalState, DEFAULT_STIPEND } from "@/lib/intern";

function tenure(start?: string | null) {
  if (!start) return null;
  const s = new Date(start);
  if (isNaN(s.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() < s.getDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y > 0 ? `${y} ปี ` : ""}${m} เดือน`.trim();
}

export default async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canSensitive = can(ctx, "people", "sensitive_view");

  const { data: emp } = await supabase
    .from("employees")
    .select(
      "*, employment_types(name, key), departments(name), teams(name), manager:manager_id(first_name, nickname)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!emp) {
    return (
      <div>
        <PageHeader title="ไม่พบข้อมูล" icon="UserX" />
        <EmptyState icon="UserX" title="ไม่พบบุคคลากรนี้" />
      </div>
    );
  }

  let comp: any[] | null = null;
  if (canSensitive) {
    const { data } = await supabase
      .from("employee_compensation")
      .select("comp_type, amount, currency, effective_date")
      .eq("employee_id", id)
      .order("effective_date", { ascending: false });
    comp = data ?? [];
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, doc_type, storage_path, external_url, created_at")
    .eq("employee_id", id)
    .order("created_at", { ascending: false });

  // audit trail for this employee — who changed what (HR/owner only)
  let auditLogs: any[] = [];
  if (canSensitive) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("audit_logs")
      .select("id, action, actor_email, meta, created_at")
      .eq("entity_id", id)
      .neq("action", "view_salary") // ไม่แสดง log การเปิดดูค่าตอบแทน (รก ไม่จำเป็น)
      .order("created_at", { ascending: false })
      .limit(30);
    auditLogs = data ?? [];
  }

  const sb = statusBadge(emp.status);
  const et = (emp as any).employment_types;
  const editHref = can(ctx, "people", "edit") ? `/people/${id}/edit` : null;

  // ฝึกงาน: logs + ประเมิน + เบี้ยฝึก (เฉพาะน้องฝึก)
  let intern: any = null;
  if (et?.key === "intern") {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: logs }, { data: evals }] = await Promise.all([
      admin.from("intern_logs").select("log_date, content").eq("intern_id", id).order("log_date", { ascending: false }),
      admin.from("intern_evaluations").select("evaluator_id, status, score, comment, evaluated_at").eq("intern_id", id).order("created_at", { ascending: false }),
    ]);
    const allLogs = logs ?? [];
    const logDates = allLogs.map((l) => l.log_date);
    const stipendStart = (emp as any).stipend_start_date ?? null;
    const rate = Number((emp as any).stipend_daily_rate) || DEFAULT_STIPEND;
    const monthStart = today.slice(0, 7) + "-01";
    const totalDays = stipendDays(logDates, stipendStart, today);
    const monthDays = stipendDays(logDates, stipendStart, today, monthStart);
    const evState = internEvalState({
      stipendStart,
      managerId: (emp as any).manager_id ?? null,
      evals: (evals ?? []).map((e: any) => ({ evaluator_id: e.evaluator_id, status: e.status })),
      isOwner: ctx.isOwner,
      isPeopleEdit: can(ctx, "people", "edit"),
      myEmployeeId: ctx.employeeId,
    });
    intern = {
      employeeId: id,
      logs: allLogs.slice(0, 30),
      evals: evals ?? [],
      stage: evState.stage,
      dueDate: evalDueFromStart((emp as any).start_date),
      mentorName: (emp as any).manager?.nickname || (emp as any).manager?.first_name || null,
      canEvaluate: evState.canEvaluate,
      evalLabel: evState.evalLabel,
      mentorPassed: evState.mentorPassed,
      stipend: {
        stipendStart,
        rate,
        monthDays,
        monthEarned: stipendAmount(monthDays, rate),
        totalDays,
        totalEarned: stipendAmount(totalDays, rate),
      },
    };
  }

  // Job Description: owner / people:edit / หัวหน้างานของคนนี้ แก้ได้ · owner ส่งต่อได้
  const canEditJD = ctx.isOwner || can(ctx, "people", "edit") || (emp as any).manager_id === ctx.employeeId;
  let jdTargets: { id: string; name: string }[] = [];
  if (ctx.isOwner) {
    const { data: list } = await supabase
      .from("employees")
      .select("id, first_name, nickname")
      .neq("id", id)
      .order("first_name");
    jdTargets = (list ?? []).map((e: any) => ({ id: e.id, name: e.nickname || e.first_name }));
  }

  return (
    <div>
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> ย้อนกลับ: รายชื่อพนักงาน
      </Link>

      {/* header card */}
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={emp.nickname || emp.first_name} src={emp.avatar_url} size={76} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">
                {emp.first_name} {emp.last_name}
                {emp.nickname && <span className="text-muted font-medium"> ({emp.nickname})</span>}
              </h1>
              <Badge tone={sb.tone}>{sb.label}</Badge>
            </div>
            <div className="text-sm text-muted mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              {emp.employee_code && <span>{emp.employee_code}</span>}
              {(emp as any).departments?.name && <span>แผนก {(emp as any).departments.name}</span>}
              {emp.position_title && <span>{emp.position_title}</span>}
              {et && <span>{et.name}</span>}
              {tenure(emp.start_date) && <span>· อยู่กับเรา {tenure(emp.start_date)}</span>}
            </div>
          </div>
          {editHref && (
            <div className="flex flex-col items-end gap-2">
              <Link href={editHref} className="btn-outline">
                <Icon name="Pencil" className="size-4" /> แก้ไข
              </Link>
              <InviteButton
                employeeId={emp.id}
                email={emp.email ?? null}
                hasAccount={!!emp.user_id}
                invitedAt={emp.invited_at ?? null}
              />
              {ctx.isOwner && (
                <EmployeeStatusActions
                  employeeId={emp.id}
                  isIntern={et?.key === "intern"}
                  status={emp.status}
                  name={emp.nickname || emp.first_name}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5">
        <JobDescriptionCard
          employeeId={id}
          initialContent={(emp as any).job_description ?? null}
          canEdit={canEditJD}
          canTransfer={ctx.isOwner}
          transferTargets={jdTargets}
        />
      </div>

      <QuestEvidence employeeId={id} />

      <EmployeeTabs e={emp} comp={comp} documents={docs ?? []} canSensitive={canSensitive} editHref={editHref} auditLogs={auditLogs} intern={intern} />
    </div>
  );
}
