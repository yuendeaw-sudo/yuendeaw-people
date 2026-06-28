import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// เพิ่มรายการปรับเงินเดือน (ระบบเก็บเป็นประวัติ ไม่ทับของเก่า) — owner / people:edit
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner && !can(ctx, "people", "edit")) return new Response("forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "");
  const amount = Number(body.amount);
  if (!employeeId || !amount || amount <= 0) {
    return new Response("employeeId + amount required", { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("employee_compensation").insert({
    employee_id: employeeId,
    comp_type: String(body.comp_type || "monthly_salary"),
    amount,
    currency: "THB",
    effective_date: body.effective_date || new Date().toISOString().slice(0, 10),
    note: body.note || null,
    created_by: ctx.userId,
  });
  if (error) return new Response(error.message, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "adjust_compensation",
    module: "people",
    entity: "employees",
    entity_id: employeeId,
    meta: { amount, comp_type: body.comp_type || "monthly_salary" },
  });

  return Response.json({ ok: true });
}
