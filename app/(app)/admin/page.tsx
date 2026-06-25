import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { OrgManager } from "@/components/admin/OrgManager";

export default async function AdminPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "admin_settings", "view")) redirect("/dashboard");
  const supabase = await createClient();

  const [{ data: empTypes }, { data: leaveTypes }, { data: roles }, { data: perms }, { data: departments }, { data: teams }] =
    await Promise.all([
      supabase.from("employment_types").select("id, name, key, color, is_active").order("sort_order"),
      supabase.from("leave_types").select("id, name, is_paid, color").order("sort_order"),
      supabase.from("roles").select("id, key, name, description"),
      supabase.from("role_permissions").select("role_id"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("teams").select("id, name, department_id").order("name"),
    ]);

  const permCount = (roleId: string) => (perms ?? []).filter((p) => p.role_id === roleId).length;

  return (
    <div className="space-y-6">
      <PageHeader title="ตั้งค่าระบบ" icon="Settings" subtitle="รูปแบบการจ้างงาน ประเภทการลา และสิทธิ์การเข้าถึง" />

      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="BriefcaseBusiness" className="size-4 text-gold" /> รูปแบบการจ้างงาน
        </h2>
        <div className="flex flex-wrap gap-2">
          {(empTypes ?? []).map((t) => (
            <span key={t.id} className="chip border border-sand" style={{ color: t.color }}>
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              {t.name}
              {!t.is_active && <span className="text-muted">(ปิด)</span>}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">แต่ละรูปแบบมี policy เริ่มต้น (วันลา, การเข้างาน, ค่าตอบแทน, สวัสดิการ) แก้ไขได้ในเฟสถัดไป</p>
      </Card>

      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="CalendarRange" className="size-4 text-grape" /> ประเภทการลา
        </h2>
        <div className="flex flex-wrap gap-2">
          {(leaveTypes ?? []).map((t) => (
            <span key={t.id} className="chip border border-sand">
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              {t.name}
              {t.is_paid ? <Badge tone="mint">มีค่าจ้าง</Badge> : <Badge tone="sand">ไม่มีค่าจ้าง</Badge>}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="Building2" className="size-4 text-brand" /> แผนก & ทีม
        </h2>
        <OrgManager departments={departments ?? []} teams={teams ?? []} />
      </Card>

      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="ShieldCheck" className="size-4 text-mint" /> Role & สิทธิ์การเข้าถึง
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(roles ?? []).map((r) => (
            <div key={r.id} className="rounded-xl bg-sand/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.name}</span>
                <Badge tone="brand">{permCount(r.id)} สิทธิ์</Badge>
              </div>
              {r.description && <p className="text-xs text-muted mt-1">{r.description}</p>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          โมเดลสิทธิ์: View · Create · Edit · Delete · Approve · Export · Sensitive View — กำหนดต่อ module และ override รายคนได้
        </p>
      </Card>
    </div>
  );
}
