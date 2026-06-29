import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, vaultConfigured } from "@/lib/crypto";

export const runtime = "nodejs";

// คลังรหัสผ่านส่วนตัวของเจ้าของ — owner เท่านั้น
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });
  if (!vaultConfigured()) return new Response("ยังไม่ได้ตั้งค่า CREDENTIAL_ENC_KEY", { status: 503 });

  const body = await req.json().catch(() => ({}));
  const id = body.id ? String(body.id) : null;
  const label = String(body.label || "").trim();
  if (!label) return new Response("ใส่ชื่อบัญชีก่อน", { status: 400 });

  const admin = createAdminClient();
  const base: any = {
    label,
    username: body.username?.trim() || null,
    url: body.url?.trim() || null,
    category: body.category?.trim() || null,
    note: body.note?.trim() || null,
    rotated_at: body.rotated_at || null,
    updated_at: new Date().toISOString(),
  };
  // เข้ารหัสรหัสผ่านเฉพาะตอนที่กรอกมา (แก้ไขแล้วเว้นว่าง = เก็บของเดิมไว้)
  const secret = typeof body.secret === "string" ? body.secret : "";

  if (id) {
    // ตรวจความเป็นเจ้าของ
    const { data: row } = await admin
      .from("owner_credentials")
      .select("owner_user_id")
      .eq("id", id)
      .maybeSingle();
    if (!row || row.owner_user_id !== ctx.userId) return new Response("ไม่พบรายการ", { status: 404 });
    if (secret) base.secret_cipher = encryptSecret(secret);
    const { error } = await admin.from("owner_credentials").update(base).eq("id", id);
    if (error) return new Response(error.message, { status: 500 });
  } else {
    if (!secret) return new Response("ใส่รหัสผ่านก่อน", { status: 400 });
    base.owner_user_id = ctx.userId;
    base.secret_cipher = encryptSecret(secret);
    const { error } = await admin.from("owner_credentials").insert(base);
    if (error) return new Response(error.message, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return new Response("id required", { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("owner_credentials")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", ctx.userId);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
