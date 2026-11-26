import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { officeConfig, cookieOptions, FLOW_COOKIE, SESSION_COOKIE } from "@/lib/office-client";
import { seal, unseal } from "@/lib/office-crypto";
import { employeeForToken } from "@/lib/office-employee";
import { localReturnPath } from "@/lib/office-policy";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = () => {
    const response = NextResponse.redirect(new URL("https://people.yuendeaw.com/login?error=employee"));
    response.cookies.set(FLOW_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    response.headers.set("Cache-Control", "private, no-store"); return response;
  };
  try {
    const config = officeConfig(url.host);
    const flow = unseal<{ state: string; verifier: string; clientId: string; expiresAt: number; next: string }>((await cookies()).get(FLOW_COOKIE)?.value, config.sessionSecret, `${url.host}:flow`);
    const code = url.searchParams.get("code");
    if (!flow || flow.expiresAt <= Date.now() || flow.clientId !== config.clientId || url.searchParams.get("state") !== flow.state || !code || code.length > 2048 || url.searchParams.has("error")) return fail();
    const tokenResponse = await fetch(`${config.issuer}/oauth/token`, { method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: config.clientId, code, redirect_uri: `${config.origin}/auth/office/callback`, code_verifier: flow.verifier }) });
    if (!tokenResponse.ok) return fail();
    const token = await tokenResponse.json();
    if (typeof token.access_token !== "string" || !Number.isFinite(token.expires_in) || token.expires_in <= 0 || !await employeeForToken(token.access_token, config.clientId)) return fail();
    const maxAge = Math.min(token.expires_in, 3600);
    const response = NextResponse.redirect(new URL(localReturnPath(flow.next), config.origin));
    response.cookies.set(SESSION_COOKIE, seal({ accessToken: token.access_token, expiresAt: Date.now() + maxAge * 1000, clientId: config.clientId }, config.sessionSecret, `${url.host}:session`), { ...cookieOptions, maxAge });
    response.cookies.set(FLOW_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); return response;
  } catch { return fail(); }
}
