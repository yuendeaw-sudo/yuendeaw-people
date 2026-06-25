import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Fields an employee may edit on their OWN profile (never salary/role/employment).
const ALLOWED = ["phone", "line_id", "address"] as const;

export async function PATCH(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.employeeId) return new Response("no employee", { status: 400 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  // read current values to diff for the audit log
  const { data: before } = await admin
    .from("employees")
    .select("phone, line_id, address, emergency_contact")
    .eq("id", ctx.employeeId)
    .maybeSingle();

  const patch: Record<string, any> = {};
  for (const k of ALLOWED) {
    if (k in body) patch[k] = body[k] === "" ? null : body[k];
  }
  if (body.emergency_contact && typeof body.emergency_contact === "object") {
    const ec = body.emergency_contact;
    patch.emergency_contact = {
      name: ec.name || "",
      phone: ec.phone || "",
      relation: ec.relation || "",
    };
  }

  if (!Object.keys(patch).length) return Response.json({ ok: true, changed: [] });

  const { error } = await admin.from("employees").update(patch).eq("id", ctx.employeeId);
  if (error) return new Response(error.message, { status: 500 });

  // what actually changed (for the HR/owner audit trail)
  const changed: string[] = [];
  for (const k of Object.keys(patch)) {
    const a = JSON.stringify((before as any)?.[k] ?? null);
    const b = JSON.stringify(patch[k] ?? null);
    if (a !== b) changed.push(k);
  }

  if (changed.length) {
    await admin.from("audit_logs").insert({
      actor_id: ctx.userId,
      actor_email: ctx.email,
      action: "self_update_profile",
      module: "people",
      entity: "employees",
      entity_id: ctx.employeeId,
      meta: { changed, before, after: patch },
    });
  }

  return Response.json({ ok: true, changed });
}
