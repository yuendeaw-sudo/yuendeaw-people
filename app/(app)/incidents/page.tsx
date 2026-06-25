import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import { IncidentRow } from "@/components/incidents/IncidentRow";

export default async function IncidentsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "incidents", "view") && !can(ctx, "incidents", "create")) redirect("/dashboard");
  const supabase = await createClient();
  const canCreate = can(ctx, "incidents", "create");
  const canEdit = can(ctx, "incidents", "edit");

  const { data: incidents } = await supabase
    .from("incidents")
    .select(
      "id, title, description, category, level, status, decision, created_at, employees!incidents_employee_id_fkey(first_name, nickname), corrective_actions(id, action_type, details)"
    )
    .order("created_at", { ascending: false });

  const { data: emps } = await supabase
    .from("employees")
    .select("id, first_name, nickname")
    .order("first_name");
  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));

  const list = incidents ?? [];
  const open = list.filter((i) => i.status !== "closed").length;

  return (
    <div>
      <PageHeader
        title="วินัย & เหตุการณ์"
        icon="ShieldAlert"
        subtitle={`${list.length} เคส · ${open} เปิดอยู่`}
        action={canCreate ? <IncidentForm employees={employees} reporterId={ctx.employeeId} /> : undefined}
      />

      <Card className="mb-5 bg-rose-soft/50 border-rose-soft">
        <p className="text-sm text-ink/80">
          ข้อมูลในหน้านี้เป็นความลับสูง — เห็นได้เฉพาะผู้มีสิทธิ์ และทุกการกระทำถูกบันทึก กระบวนการเป็นธรรม:
          เปิดเคส → HR พิจารณา → ขอคำชี้แจง → ตัดสิน → ปิดเคส
        </p>
      </Card>

      {list.length ? (
        <div className="space-y-2.5">
          {list.map((inc) => (
            <IncidentRow key={inc.id} inc={inc} canEdit={canEdit} />
          ))}
        </div>
      ) : (
        <EmptyState icon="ShieldCheck" title="ยังไม่มีเคส" subtitle="ดีมาก! ยังไม่มีเหตุการณ์ที่ต้องบันทึก" />
      )}
    </div>
  );
}
