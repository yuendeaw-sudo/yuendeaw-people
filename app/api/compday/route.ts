import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// owner ให้วันหยุดสะสมจากการทุ่มเท (change day off) ด้วยดุลยพินิจ
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "");
  const days = Number(body.days);
  if (!employeeId) return new Response("เลือกพนักงานก่อนนะ", { status: 400 });
  if (!days || days <= 0) return new Response("จำนวนวันต้องมากกว่า 0", { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("comp_day_off").insert({
    employee_id: employeeId,
    days,
    hours: body.hours ? Number(body.hours) : null,
    work_date: body.workDate || null,
    note: body.note ? String(body.note).trim() : null,
    granted_by: ctx.userId,
  });
  if (error) return new Response(error.message, { status: 500 });

  // แจ้งพนักงาน (โทนน่ารัก ขอบคุณการทุ่มเท)
  const { data: emp } = await admin.from("employees").select("user_id").eq("id", employeeId).maybeSingle();
  if (emp?.user_id) {
    await admin.from("notifications").insert({
      user_id: emp.user_id,
      title: "ได้รับวันหยุดสะสม 🌴",
      body: `ขอบคุณที่ทุ่มเทให้ทีม — รับวันหยุดสะสม +${days} วัน${body.note ? ` · ${body.note}` : ""}`,
      link: "/time-leave",
      kind: "compday",
    });
  }

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "grant_comp_day_off",
    module: "time_leave",
    entity: "employees",
    entity_id: employeeId,
    meta: { days, hours: body.hours ?? null, note: body.note ?? null },
  });

  return Response.json({ ok: true });
}

// owner ถอนรายการที่ให้ผิด
export async function DELETE(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return new Response("id required", { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("comp_day_off").delete().eq("id", id);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
