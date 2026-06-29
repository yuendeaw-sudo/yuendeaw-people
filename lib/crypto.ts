import crypto from "crypto";

// กุญแจ 32 ไบต์ (hex 64 ตัว) จาก env — ไม่เก็บใน DB
const KEY_HEX = process.env.CREDENTIAL_ENC_KEY || "";

export function vaultConfigured(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(KEY_HEX);
}

function key(): Buffer {
  if (!vaultConfigured()) {
    throw new Error("CREDENTIAL_ENC_KEY ไม่ถูกตั้งค่า (ต้องเป็น hex 64 ตัว)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

// คืนค่า base64 ของ [iv(12) | authTag(16) | ciphertext]
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
