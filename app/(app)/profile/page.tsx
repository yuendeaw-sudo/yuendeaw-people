import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader, Badge, statusBadge, EmptyState } from "@/components/ui";
import { formatThaiDate } from "@/lib/utils";
import { workModeLabel } from "@/lib/phase2-labels";
import { stipendDays, stipendAmount, DEFAULT_STIPEND } from "@/lib/intern";
import { Icon } from "@/components/Icon";
import { InternDailyLog } from "@/components/intern/InternDailyLog";
import { SalaryReveal } from "@/components/profile/SalaryReveal";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { EmployeeDocuments } from "@/components/people/EmployeeDocuments";
import { JobDescriptionCard } from "@/components/people/JobDescriptionCard";

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
      "*, employment_types(name, color, key), departments(name), teams(name), manager:manager_id(first_name, nickname)"
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

  // own documents (admin client — reading one's own files, no RLS guesswork)
  const { data: myDocs } = await createAdminClient()
    .from("documents")
    .select("id, title, doc_type, storage_path, created_at")
    .eq("employee_id", ctx.employeeId)
    .order("created_at", { ascending: false });

  if (!emp) return null;
  const et = (emp as any).employment_types;
  const sb = statusBadge(emp.status);
  const mgr = (emp as any).manager;
  const ec = (emp.emergency_contact ?? {}) as any;

  // ฝึกงาน: บันทึกประจำวัน + เบี้ยฝึก (เฉพาะน้องฝึก)
  let internData: any = null;
  if (et?.key === "intern") {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: logs }, { data: ev }] = await Promise.all([
      admin.from("intern_logs").select("log_date, content").eq("intern_id", ctx.employeeId).order("log_date", { ascending: false }),
      admin.from("intern_evaluations").select("status").eq("intern_id", ctx.employeeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const allLogs = logs ?? [];
    const logDates = allLogs.map((l) => l.log_date);
    const stipendStart = (emp as any).stipend_start_date ?? null;
    const rate = Number((emp as any).stipend_daily_rate) || DEFAULT_STIPEND;
    const monthStart = today.slice(0, 7) + "-01";
    const totalDays = stipendDays(logDates, stipendStart, today);
    const monthDays = stipendDays(logDates, stipendStart, today, monthStart);
    internData = {
      todayDate: today,
      todayLog: allLogs.find((l) => l.log_date === today)?.content ?? "",
      recentLogs: allLogs.slice(0, 10),
      stipend: {
        evalStatus: ev?.status ?? null,
        stipendStart,
        rate,
        monthDays,
        monthEarned: stipendAmount(monthDays, rate),
        totalDays,
        totalEarned: stipendAmount(totalDays, rate),
      },
    };
  }

  return (
    <div>
      <PageHeader title="โปรไฟล์ของฉัน" icon="User" />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <AvatarUpload name={emp.nickname || emp.first_name} src={emp.avatar_url} size={72} />
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

      <div className="mb-5">
        <JobDescriptionCard
          employeeId={ctx.employeeId!}
          initialContent={(emp as any).job_description ?? null}
          canEdit
        />
      </div>

      {internData && (
        <Card className="mb-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="GraduationCap" className="size-4 text-grape" /> ฝึกงาน — บันทึกประจำวัน
          </h3>
          <InternDailyLog {...internData} />
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="IdCard" className="size-4 text-gold" /> ข้อมูลงาน
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสพนักงาน" value={emp.employee_code} />
              <Field label="อีเมล" value={emp.email} />
              <Field label="ทีม" value={(emp as any).teams?.name} />
              <Field label="หัวหน้างาน" value={mgr?.nickname || mgr?.first_name} />
              <Field label="รูปแบบการทำงาน" value={workModeLabel(emp.work_mode)} />
              <Field label="วันเริ่มงาน" value={formatThaiDate(emp.start_date)} />
            </div>
          </Card>

          {/* Self-editable contact info — changes are audited */}
          <Card>
            <ProfileEditForm
              phone={emp.phone}
              lineId={emp.line_id}
              address={emp.address}
              emergency={ec}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="Wallet" className="size-4 text-mint" /> ค่าตอบแทนของฉัน
            </h3>
            {comp ? (
              <SalaryReveal
                amount={Number(comp.amount)}
                compType={comp.comp_type}
                ssoEnrolled={(emp.social_security ?? "enrolled") !== "not_enrolled"}
                withholding={Number(emp.withholding_tax) > 0}
              />
            ) : (
              <p className="text-sm text-muted">ยังไม่มีข้อมูลค่าตอบแทน</p>
            )}
            <p className="text-xs text-muted mt-3">
              ซ่อนไว้โดยค่าเริ่มต้น กดรูปตาเพื่อแสดง · ข้อมูลนี้เห็นได้เฉพาะคุณและผู้มีสิทธิ์
            </p>
          </Card>

          {/* Self-service documents — visible to HR/owner on the employee file */}
          <Card>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Icon name="FolderArchive" className="size-4 text-grape" /> เอกสารของฉัน
            </h3>
            <p className="text-xs text-muted mb-4">
              อัปโหลดเองได้เลย — HR / ผู้ดูแลจะเห็นในแฟ้มพนักงานของคุณ
            </p>
            <EmployeeDocuments
              employeeId={ctx.employeeId}
              initialDocs={myDocs ?? []}
              canEdit
              canView
              zones={["id", "house_reg", "bank_book", "other"]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
