import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TYPE_KEY: Record<string, string> = { employee: "full_time", intern: "intern", freelance: "freelance" };
const TYPE_STATUS: Record<string, string> = { employee: "probation", intern: "active", freelance: "freelance" };
const APP_STAGE: Record<string, string> = {
  employee: "moved_to_employee",
  intern: "moved_to_intern",
  freelance: "moved_to_freelance",
};

// แปลงผู้สมัคร → พนักงาน/ฝึกงาน/ฟรีแลนซ์ (ไม่ลบใบสมัครเดิม)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner && !(can(ctx, "applications", "edit") && can(ctx, "people", "create")))
    return new Response("forbidden", { status: 403 });

  const b = await req.json().catch(() => ({}));
  const target = String(b.target || "");
  if (!(target in TYPE_KEY)) return new Response("target ไม่ถูกต้อง", { status: 400 });

  const admin = createAdminClient();
  const { data: app } = await admin.from("applications").select("*").eq("id", id).maybeSingle();
  if (!app) return new Response("ไม่พบใบสมัคร", { status: 404 });

  const { data: et } = await admin.from("employment_types").select("id").eq("key", TYPE_KEY[target]).maybeSingle();

  const emp: any = {
    first_name: app.full_name,
    nickname: app.nickname || null,
    email: app.email || null,
    phone: app.phone || null,
    position_title: b.position || app.position || null,
    employment_type_id: et?.id ?? null,
    status: TYPE_STATUS[target],
    start_date: b.start_date || null,
    team_id: b.team_id || null,
    manager_id: b.manager_id || null,
  };
  if (target === "intern") {
    emp.stipend_daily_rate = b.allowance ? Number(b.allowance) : undefined;
    emp.stipend_start_date = b.internship_start_date || null;
  }
  // เก็บรายละเอียดเพิ่มเติมที่กรอกตอน convert ไว้ใน answers-like fields ถ้ามีคอลัมน์ ไม่งั้นข้าม
  if (target === "freelance" && b.tax_id) emp.tax_id = undefined; // (เผื่อมีคอลัมน์ภายหลัง)

  const { data: newEmp, error } = await admin.from("employees").insert(emp).select("id").single();
  if (error) return new Response(error.message, { status: 500 });

  // ตั้งเงินเดือน (ถ้าระบุ) สำหรับพนักงาน/ฟรีแลนซ์
  if ((target === "employee" || target === "freelance") && b.salary) {
    await admin.from("employee_compensation").insert({
      employee_id: newEmp.id,
      comp_type: target === "freelance" ? "project" : "monthly_salary",
      amount: Number(b.salary),
      currency: "THB",
      effective_date: b.start_date || new Date().toISOString().slice(0, 10),
      created_by: ctx.userId,
    });
  }

  await admin
    .from("applications")
    .update({
      stage: APP_STAGE[target],
      converted_employee_id: newEmp.id,
      converted_kind: target,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "application_converted",
    module: "applications",
    entity: "applications",
    entity_id: id,
    meta: { title: `แปลงเป็น${target === "employee" ? "พนักงาน" : target === "intern" ? "เด็กฝึก" : "ฟรีแลนซ์"}`, employee_id: newEmp.id },
  });

  return Response.json({ ok: true, employeeId: newEmp.id });
}
