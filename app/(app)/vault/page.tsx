import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { vaultConfigured } from "@/lib/crypto";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { VaultForm } from "@/components/vault/VaultForm";
import { CredentialRow } from "@/components/vault/CredentialRow";

export default async function VaultPage() {
  const ctx = (await getAccessContext())!;
  if (!ctx.isOwner) redirect("/dashboard");

  const configured = vaultConfigured();
  let creds: any[] = [];
  if (configured) {
    const admin = createAdminClient();
    // ไม่ดึง secret_cipher — เปิดดูทีละรายการผ่าน /api/vault/reveal
    const { data } = await admin
      .from("owner_credentials")
      .select("id, label, username, url, category, rotated_at, note, updated_at")
      .eq("owner_user_id", ctx.userId)
      .order("label");
    creds = data ?? [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="รหัสผ่านของฉัน"
        icon="KeyRound"
        subtitle="คลังรหัสผ่านส่วนตัว เข้ารหัสไว้ เห็นได้เฉพาะคุณ (เจ้าของ)"
        action={configured ? <VaultForm /> : undefined}
      />

      <Card className="border-amber-soft bg-amber-soft/30">
        <p className="text-sm flex items-start gap-2">
          <Icon name="ShieldCheck" className="size-4 text-mint shrink-0 mt-0.5" />
          รหัสผ่านถูก <b>เข้ารหัส AES-256</b> ก่อนเก็บ · กุญแจอยู่นอกฐานข้อมูล · เข้าถึงได้เฉพาะบัญชีเจ้าของของคุณเท่านั้น
        </p>
      </Card>

      {!configured ? (
        <Card>
          <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
            <Icon name="Settings" className="size-4 text-amber" /> ต้องตั้งค่ากุญแจก่อนใช้งาน
          </h2>
          <p className="text-sm text-muted mb-3">
            เพิ่ม environment variable <code className="bg-sand px-1.5 py-0.5 rounded">CREDENTIAL_ENC_KEY</code> (hex 64 ตัว)
            ใน Vercel ของโปรเจกต์ People OS แล้ว redeploy — ระบบจึงจะเข้ารหัส/ถอดรหัสได้
          </p>
        </Card>
      ) : creds.length ? (
        <div className="grid md:grid-cols-2 gap-3">
          {creds.map((c) => (
            <CredentialRow key={c.id} cred={c} />
          ))}
        </div>
      ) : (
        <EmptyState icon="KeyRound" title="ยังไม่มีบัญชีในคลัง" subtitle="กด 'เพิ่มบัญชี' เพื่อเก็บรหัสผ่านแบบเข้ารหัส" />
      )}
    </div>
  );
}
