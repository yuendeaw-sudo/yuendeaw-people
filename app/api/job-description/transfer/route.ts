import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// owner ส่งต่อ Job Description ให้พนักงานที่มารับช่วงงาน (คัดลอก + แจ้งเตือน)
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("forbidden", { status: 403 }); // owner เท่านั้น

  const { fromEmployeeId, toEmployeeId } = await req.json().catch(() => ({}));
  if (!fromEmployeeId || !toEmployeeId || fromEmployeeId === toEmployeeId) {
    return new Response("fromEmployeeId + toEmployeeId required", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: from } = await admin
    .from("employees")
    .select("job_description, first_name, nickname")
    .eq("id", fromEmployeeId)
    .maybeSingle();
  if (!from) return new Response("source not found", { status: 404 });

  const { data: to } = await admin
    .from("employees")
    .select("id, user_id")
    .eq("id", toEmployeeId)
    .maybeSingle();
  if (!to) return new Response("target not found", { status: 404 });

  const { error } = await admin
    .from("employees")
    .update({ job_description: from.job_description })
    .eq("id", toEmployeeId);
  if (error) return new Response(error.message, { status: 500 });

  // แจ้งเตือนพนักงานที่รับช่วงงาน
  if (to.user_id) {
    await admin.from("notifications").insert({
      user_id: to.user_id,
      title: "ได้รับ Job Description รับช่วงงาน 📋",
      body: `คุณได้รับมอบหมายหน้าที่ความรับผิดชอบจาก ${from.nickname || from.first_name} — ดูได้ที่โปรไฟล์ของคุณ`,
      link: "/profile",
      kind: "job_description",
    });
  }

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "transfer_job_description",
    module: "people",
    entity: "employees",
    entity_id: toEmployeeId,
    meta: { from: fromEmployeeId },
  });

  return Response.json({ ok: true });
}
