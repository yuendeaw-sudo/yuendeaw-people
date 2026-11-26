import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function seal(value: unknown, secret: string, purpose: string): string {
  if (secret.length < 43) throw new Error("Office session encryption is not configured");
  const iv = randomBytes(12), key = createHash("sha256").update(secret).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal<T>(value: string | undefined, secret: string, purpose: string): T | null {
  if (!value || value.length > 12000 || secret.length < 43) return null;
  try {
    const data = Buffer.from(value, "base64url"), key = createHash("sha256").update(secret).digest();
    const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
  } catch { return null; }
}
