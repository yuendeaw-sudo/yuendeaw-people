import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// พี่เลี้ยง (หัวหน้างาน) หรือ owner ประเมินน้องฝึก
// ผ่าน → ตั้ง stipend_start_date เริ่มนับเบี้ยฝึกรายวัน
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const internId = String(body.intern_id || "");
  const status = String(body.status || ""); // passed | failed
  if (!internId || !["passed", "failed"].includes(status)) {
    return new Response("intern_id + status (passed/failed) required", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: intern } = await admin
    .from("employees")
    .select("id, manager_id, stipend_start_date, user_id")
    .eq("id", internId)
    .maybeSingle();
  if (!intern) return new Response("not found", { status: 404 });

  // อนุญาต: owner / people:edit / พี่เลี้ยง(หัวหน้างาน)ของน้องคนนี้
  const isMentor = ctx.employeeId && intern.manager_id === ctx.employeeId;
  if (!ctx.isOwner && !can(ctx, "people", "edit") && !isMentor) {
    return new Response("forbidden", { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: evErr } = await admin.from("intern_evaluations").insert({
    intern_id: internId,
    evaluator_id: ctx.employeeId,
    status,
    score: body.score ? Number(body.score) : null,
    comment: body.comment || null,
    evaluated_at: new Date().toISOString(),
  });
  if (evErr) return new Response(evErr.message, { status: 500 });

  // ผ่านแล้วเริ่มนับเบี้ย (ถ้ายังไม่เคยตั้ง)
  if (status === "passed" && !intern.stipend_start_date) {
    await admin.from("employees").update({ stipend_start_date: today }).eq("id", internId);
  }

  // แจ้งน้องฝึก (notifications ใช้ user_id ของบัญชี)
  if (intern.user_id) {
    await admin.from("notifications").insert({
      user_id: intern.user_id,
      title: status === "passed" ? "ผ่านการประเมินฝึกงาน 🎉" : "ผลการประเมินฝึกงาน",
      body:
        status === "passed"
          ? "ยินดีด้วย! เริ่มได้รับเบี้ยฝึกรายวันตั้งแต่วันนี้"
          : "พี่เลี้ยงได้บันทึกผลการประเมินแล้ว",
      kind: "intern_eval",
    });
  }

  return Response.json({ ok: true, stipendStarted: status === "passed" });
}
