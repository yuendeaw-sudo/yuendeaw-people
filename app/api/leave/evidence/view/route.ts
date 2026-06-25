import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "leave-evidence";

export async function GET(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return new Response("no path", { status: 400 });

  // allow: the file owner (path begins with their employee id), or leave viewers/owner
  const isOwnerOfFile = ctx.employeeId && path.startsWith(`${ctx.employeeId}/`);
  if (!isOwnerOfFile && !ctx.isOwner && !can(ctx, "time_leave", "view")) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data) return new Response("not found", { status: 404 });

  return Response.redirect(data.signedUrl, 302);
}
