import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "leave-evidence";
const MAX = 10 * 1024 * 1024; // 10MB
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("no file", { status: 400 });
  if (file.size > MAX) return new Response("ไฟล์ใหญ่เกิน 10MB", { status: 413 });
  if (!OK_TYPES.includes(file.type)) return new Response("รองรับเฉพาะรูปภาพหรือ PDF", { status: 415 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${ctx.employeeId ?? "unknown"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ path });
}
