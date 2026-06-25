import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, statusBadge, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EmployeeTabs } from "@/components/people/EmployeeTabs";
import { QuestEvidence } from "@/components/quests/QuestEvidence";
import { InviteButton } from "@/components/people/InviteButton";

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
      "*, employment_types(name), departments(name), teams(name), manager:manager_id(first_name, nickname)"
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
    await audit(ctx, "view_salary", { module: "people", entity: "employees", entityId: id });
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, doc_type, external_url")
    .eq("employee_id", id)
    .order("created_at", { ascending: false });

  const sb = statusBadge(emp.status);
  const et = (emp as any).employment_types;
  const editHref = can(ctx, "people", "edit") ? `/people/${id}/edit` : null;

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
            </div>
          )}
        </div>
      </div>

      <QuestEvidence employeeId={id} />

      <EmployeeTabs e={emp} comp={comp} documents={docs ?? []} canSensitive={canSensitive} editHref={editHref} />
    </div>
  );
}
