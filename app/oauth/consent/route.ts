import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { employeeForUser } from "@/lib/office-employee";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const url = new URL(req.url), authorizationId = url.searchParams.get("authorization_id");
  if (url.hostname !== "people.yuendeaw.com" || !authorizationId || !/^[a-zA-Z0-9_-]{16,128}$/.test(authorizationId)) return NextResponse.json({ error: "Invalid authorization" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin));
  try {
    if (!await employeeForUser(user)) return NextResponse.redirect(new URL("/login?error=employee", url.origin));
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error || !data) return NextResponse.json({ error: "Authorization expired" }, { status: 400 });
    const clients = [process.env.OFFICE_WWW_CLIENT_ID, process.env.OFFICE_AI_CLIENT_ID, process.env.OFFICE_ADS_CLIENT_ID].filter(Boolean);
    const callbacks = new Set(["https://www.yuendeaw.com/auth/office/callback", "https://aioffice.yuendeaw.com/auth/office/callback", "https://ads.yuendeaw.com/auth/office/callback"]);
    let target: string;
    if ("authorization_id" in data) {
      if (!clients.includes(data.client.id) || !callbacks.has(data.redirect_uri) || (data.scope ?? "").split(" ").filter(Boolean).some(s => s !== "email")) return NextResponse.json({ error: "Office client not allowed" }, { status: 403 });
      // Only the employer-configured first-party applications are approved automatically.
      const approval = await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true });
      if (approval.error || !approval.data) return NextResponse.json({ error: "Authorization failed" }, { status: 400 });
      target = approval.data.redirect_url;
    } else target = data.redirect_url;
    const redirect = new URL(target);
    if (!callbacks.has(redirect.origin + redirect.pathname)) return NextResponse.json({ error: "Invalid callback" }, { status: 403 });
    const response = NextResponse.redirect(redirect); response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); return response;
  } catch { return NextResponse.json({ error: "Employee verification unavailable" }, { status: 503 }); }
}
