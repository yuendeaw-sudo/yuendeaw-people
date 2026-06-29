import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, vaultConfigured } from "@/lib/crypto";

export const runtime = "nodejs";

// ถอดรหัสรหัสผ่านทีละรายการ (owner เท่านั้น) — ไม่ log ค่ารหัส
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });
  if (!vaultConfigured()) return new Response("ยังไม่ได้ตั้งค่า CREDENTIAL_ENC_KEY", { status: 503 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return new Response("id required", { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("owner_credentials")
    .select("secret_cipher, owner_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.owner_user_id !== ctx.userId) return new Response("ไม่พบรายการ", { status: 404 });

  try {
    return Response.json({ secret: decryptSecret(row.secret_cipher) });
  } catch {
    return new Response("ถอดรหัสไม่สำเร็จ (กุญแจไม่ตรง?)", { status: 500 });
  }
}
