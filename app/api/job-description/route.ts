import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// แก้ Job Description — owner / คนมีสิทธิ์ people:edit / หัวหน้างานของคนนี้ / เจ้าตัว
export async function PATCH(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const { employeeId, content } = await req.json().catch(() => ({}));
  if (!employeeId) return new Response("employeeId required", { status: 400 });

  const admin = createAdminClient();
  const { data: emp } = await admin
    .from("employees")
    .select("id, manager_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!emp) return new Response("not found", { status: 404 });

  const canEdit =
    ctx.isOwner ||
    can(ctx, "people", "edit") ||
    emp.id === ctx.employeeId || // เจ้าตัว
    emp.manager_id === ctx.employeeId; // หัวหน้างาน
  if (!canEdit) return new Response("forbidden", { status: 403 });

  const { error } = await admin
    .from("employees")
    .update({ job_description: content?.trim() || null })
    .eq("id", employeeId);
  if (error) return new Response(error.message, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "edit_job_description",
    module: "people",
    entity: "employees",
    entity_id: employeeId,
  });

  return Response.json({ ok: true });
}
