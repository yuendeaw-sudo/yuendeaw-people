import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Avatar, Badge, statusBadge, EmptyState } from "@/components/ui";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { Icon } from "@/components/Icon";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value || "—"}</div>
    </div>
  );
}

export default async function ProfilePage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();

  if (!ctx.employeeId) {
    return (
      <div>
        <PageHeader title="โปรไฟล์ของฉัน" icon="User" />
        <EmptyState
          icon="UserPlus"
          title="ยังไม่มีข้อมูลพนักงาน"
          subtitle="บัญชีของคุณยังไม่ถูกผูกกับข้อมูลพนักงาน — กรุณาติดต่อ HR เพื่อตั้งค่าโปรไฟล์"
        />
      </div>
    );
  }

  const { data: emp } = await supabase
    .from("employees")
    .select(
      "*, employment_types(name, color), departments(name), teams(name), manager:manager_id(first_name, nickname)"
    )
    .eq("id", ctx.employeeId)
    .maybeSingle();

  const { data: comp } = await supabase
    .from("employee_compensation")
    .select("comp_type, amount, currency, effective_date")
    .eq("employee_id", ctx.employeeId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!emp) return null;
  const et = (emp as any).employment_types;
  const sb = statusBadge(emp.status);
  const mgr = (emp as any).manager;

  return (
    <div>
      <PageHeader title="โปรไฟล์ของฉัน" icon="User" />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={emp.nickname || emp.first_name} src={emp.avatar_url} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">
                {emp.first_name} {emp.last_name}
                {emp.nickname && <span className="text-muted font-medium"> ({emp.nickname})</span>}
              </h2>
              <Badge tone={sb.tone}>{sb.label}</Badge>
            </div>
            <p className="text-muted text-sm mt-0.5">
              {emp.position_title || "—"} {et && `· ${et.name}`}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="IdCard" className="size-4 text-gold" /> ข้อมูลทั่วไป
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="รหัสพนักงาน" value={emp.employee_code} />
            <Field label="อีเมล" value={emp.email} />
            <Field label="เบอร์โทร" value={emp.phone} />
            <Field label="แผนก" value={(emp as any).departments?.name} />
            <Field label="ทีม" value={(emp as any).teams?.name} />
            <Field label="หัวหน้างาน" value={mgr?.nickname || mgr?.first_name} />
            <Field label="รูปแบบการทำงาน" value={emp.work_mode} />
            <Field label="วันเริ่มงาน" value={formatThaiDate(emp.start_date)} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="Wallet" className="size-4 text-mint" /> ค่าตอบแทนของฉัน
            </h3>
            {comp ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatTHB(Number(comp.amount))}</span>
                <span className="text-sm text-muted">/ {comp.comp_type}</span>
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีข้อมูลค่าตอบแทน</p>
            )}
            <p className="text-xs text-muted mt-2">ข้อมูลนี้เห็นได้เฉพาะคุณและผู้มีสิทธิ์เท่านั้น</p>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="Phone" className="size-4 text-rose" /> ผู้ติดต่อฉุกเฉิน
            </h3>
            {emp.emergency_contact && Object.keys(emp.emergency_contact).length ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="ชื่อ" value={(emp.emergency_contact as any).name} />
                <Field label="เบอร์โทร" value={(emp.emergency_contact as any).phone} />
                <Field label="ความสัมพันธ์" value={(emp.emergency_contact as any).relation} />
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่ได้กรอกข้อมูล</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
