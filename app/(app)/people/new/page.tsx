import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { loadEmployeeFormOptions } from "@/lib/people-options";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EmployeeForm } from "@/components/people/EmployeeForm";

export default async function NewEmployeePage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "create")) redirect("/people");

  const options = await loadEmployeeFormOptions();

  return (
    <div>
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> กลับ
      </Link>
      <PageHeader title="เพิ่มพนักงาน" icon="UserPlus" subtitle="เพิ่มคนเข้าระบบ — พนักงาน เด็กฝึกงาน หรือ freelance" />
      <EmployeeForm
        mode="create"
        options={options}
        canSensitive={can(ctx, "people", "sensitive_view")}
        canAssignRoles={can(ctx, "admin_settings", "edit")}
      />
    </div>
  );
}
