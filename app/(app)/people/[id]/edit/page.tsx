import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { loadEmployeeFormOptions } from "@/lib/people-options";
import { PageHeader, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EmployeeForm } from "@/components/people/EmployeeForm";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "edit")) redirect(`/people/${id}`);
  const supabase = await createClient();
  const canSensitive = can(ctx, "people", "sensitive_view");

  const { data: employee } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (!employee) {
    return <EmptyState icon="UserX" title="ไม่พบพนักงานนี้" />;
  }

  const options = await loadEmployeeFormOptions(id);

  const { data: roleRows } = await supabase.from("employee_roles").select("role_id").eq("employee_id", id);
  const currentRoleIds = (roleRows ?? []).map((r) => r.role_id);

  let compHistory: any[] = [];
  if (canSensitive) {
    const { data } = await supabase
      .from("employee_compensation")
      .select("comp_type, amount, effective_date")
      .eq("employee_id", id)
      .order("effective_date", { ascending: false });
    compHistory = data ?? [];
  }

  return (
    <div>
      <Link href={`/people/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> กลับ
      </Link>
      <PageHeader title="แก้ไขพนักงาน" icon="Pencil" subtitle={`${employee.first_name} ${employee.last_name ?? ""}`} />
      <EmployeeForm
        mode="edit"
        employee={employee}
        options={options}
        currentRoleIds={currentRoleIds}
        compHistory={compHistory}
        canSensitive={canSensitive}
        canAssignRoles={can(ctx, "admin_settings", "edit")}
      />
    </div>
  );
}
