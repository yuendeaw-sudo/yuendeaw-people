import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AccessContext } from "@/lib/permissions";

/**
 * Build the AccessContext for the current request from the Supabase session.
 * Returns null when not authenticated.
 *
 * Wrapped in React cache() so the layout + page (+ any nested server component)
 * that all call this within one request share a SINGLE computation instead of
 * re-running the whole query chain each time. Independent queries also run in
 * parallel to cut round-trips.
 */
export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // app_users + employee are independent (both keyed on user.id) → fetch together
  const [{ data: appUser }, { data: employee }] = await Promise.all([
    supabase.from("app_users").select("is_owner, full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("employees").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isOwner = appUser?.is_owner ?? false;
  const employeeId = employee?.id ?? null;
  const perms = new Set<string>();

  if (employeeId) {
    // roles + per-person overrides are independent → fetch together
    const [{ data: roleRows }, { data: overrides }] = await Promise.all([
      supabase.from("employee_roles").select("role_id").eq("employee_id", employeeId),
      supabase.from("permission_overrides").select("module, action, allow").eq("employee_id", employeeId),
    ]);

    const roleIds = (roleRows ?? []).map((r) => r.role_id);
    if (roleIds.length) {
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("permissions(module, action)")
        .in("role_id", roleIds);
      for (const row of rp ?? []) {
        const p = (row as any).permissions;
        if (p) perms.add(`${p.module}:${p.action}`);
      }
    }

    // overrides applied AFTER role perms so grant/revoke wins (order preserved)
    for (const o of overrides ?? []) {
      const key = `${o.module}:${o.action}`;
      if (o.allow) perms.add(key);
      else perms.delete(key);
    }
  }

  return {
    userId: user.id,
    email: appUser?.email ?? user.email ?? "",
    fullName: appUser?.full_name ?? null,
    isOwner,
    employeeId,
    perms,
  };
});

/** Write an audit log row. Best-effort; never throws. */
export async function audit(
  ctx: AccessContext | null,
  action: string,
  opts: { module?: string; entity?: string; entityId?: string; meta?: any } = {}
) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: ctx?.userId ?? null,
      actor_email: ctx?.email ?? null,
      action,
      module: opts.module ?? null,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      meta: opts.meta ?? {},
    });
  } catch {
    /* swallow — auditing must not break the request */
  }
}
