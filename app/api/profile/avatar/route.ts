import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "avatars";
const MAX = 5 * 1024 * 1024; // 5MB
const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Employee uploads their own profile photo.
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.employeeId) return new Response("no employee", { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("no file", { status: 400 });
  if (file.size > MAX) return new Response("รูปใหญ่เกิน 5MB", { status: 413 });
  if (!OK_TYPES.includes(file.type)) return new Response("รองรับเฉพาะรูปภาพ (PNG/JPG/WebP)", { status: 415 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${ctx.employeeId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
  if (up.error) return new Response(up.error.message, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = pub.publicUrl;

  const { error } = await admin.from("employees").update({ avatar_url: avatarUrl }).eq("id", ctx.employeeId);
  if (error) return new Response(error.message, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: "self_update_avatar",
    module: "people",
    entity: "employees",
    entity_id: ctx.employeeId,
    meta: { avatar_url: avatarUrl },
  });

  return Response.json({ ok: true, avatarUrl });
}
