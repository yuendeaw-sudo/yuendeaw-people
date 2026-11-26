import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { FLOW_COOKIE, cookieOptions, officeConfig } from "@/lib/office-client";
import { seal } from "@/lib/office-crypto";
import { localReturnPath } from "@/lib/office-policy";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const incoming = new URL(req.url), config = officeConfig(incoming.host);
    const state = randomBytes(32).toString("base64url"), verifier = randomBytes(48).toString("base64url");
    const target = new URL(`${config.issuer}/oauth/authorize`);
    target.search = new URLSearchParams({ response_type: "code", client_id: config.clientId, redirect_uri: `${config.origin}/auth/office/callback`, state, scope: "email", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(FLOW_COOKIE, seal({ state, verifier, clientId: config.clientId, expiresAt: Date.now() + 600000, next: localReturnPath(incoming.searchParams.get("next"), incoming.host === "aioffice.yuendeaw.com" ? "/ops" : "/office") }, config.sessionSecret, `${incoming.host}:flow`), { ...cookieOptions, maxAge: 600 });
    return response;
  } catch { return NextResponse.json({ error: "ระบบล็อกอินกลางยังไม่พร้อม" }, { status: 503 }); }
}
