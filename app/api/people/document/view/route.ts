import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "employee-docs";

// Returns a short-lived signed URL (redirect) to view/download an employee doc.
// ?path=<storage path>&download=1 forces a download; otherwise opens inline (good for print).
export async function GET(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const download = url.searchParams.get("download") === "1";
  if (!path) return new Response("no path", { status: 400 });

  // allow: the employee whose file it is, or owner / people-sensitive viewers
  const isOwnerOfFile = ctx.employeeId && path.startsWith(`${ctx.employeeId}/`);
  if (!isOwnerOfFile && !ctx.isOwner && !can(ctx, "people", "sensitive_view")) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 120, download ? { download: true } : undefined);
  if (error || !data) return new Response("not found", { status: 404 });

  return Response.redirect(data.signedUrl, 302);
}
