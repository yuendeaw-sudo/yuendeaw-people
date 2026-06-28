import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// owner ตั้ง/ปรับ เรตค่า OT ต่อครั้ง ของพนักงานคนหนึ่ง (ปรับได้ทุกเมื่อ)
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "");
  if (!employeeId) return new Response("employeeId required", { status: 400 });
  const rate = body.rate === "" || body.rate == null ? null : Number(body.rate);
  if (rate != null && (!Number.isFinite(rate) || rate < 0))
    return new Response("เรตไม่ถูกต้อง", { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ ot_rate: rate }).eq("id", employeeId);
  if (error) return new Response(error.message, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "set_ot_rate",
    module: "people",
    entity: "employees",
    entity_id: employeeId,
    meta: { ot_rate: rate },
  });

  return Response.json({ ok: true });
}
