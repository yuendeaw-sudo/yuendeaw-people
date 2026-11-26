import { cookies, headers } from "next/headers";
import { employeeForToken, type OfficeIdentity } from "./office-employee";
import { unseal } from "./office-crypto";

export const SESSION_COOKIE = "__Host-office-session";
export const FLOW_COOKIE = "__Host-office-flow";
export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export type OfficeSession = { accessToken: string; expiresAt: number; clientId: string };
export function officeConfig(host: string) {
  const key = host === "www.yuendeaw.com" ? "WWW" : host === "aioffice.yuendeaw.com" ? "AI" : null;
  if (!key) throw new Error("Unsupported office host");
  const clientId = process.env[`OFFICE_${key}_CLIENT_ID`] ?? "";
  if (!clientId) throw new Error("Office login is not configured");
  return { clientId, origin: `https://${host}`, issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`, sessionSecret: process.env.OFFICE_SESSION_SECRET ?? "" };
}
export async function getOfficeIdentity(): Promise<OfficeIdentity | null> {
  try {
    const host = (await headers()).get("host") ?? "", config = officeConfig(host);
    const session = unseal<OfficeSession>((await cookies()).get(SESSION_COOKIE)?.value, config.sessionSecret, `${host}:session`);
    if (!session || session.expiresAt <= Date.now() || session.clientId !== config.clientId) return null;
    return await employeeForToken(session.accessToken, config.clientId);
  } catch { return null; }
}
