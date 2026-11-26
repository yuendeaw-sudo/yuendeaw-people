import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getOfficeIdentity } from "@/lib/office-client";
import { localReturnPath } from "@/lib/office-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const backend = "https://stand-ai-owner-desk.addgap.chatgpt.site";
const servicePaths = new Set(["/api/direct/worker", "/api/scheduler/tick", "/api/scheduler/health", "/api/md-pilot/worker", "/api/brief/refresh-snapshot", "/api/brief/refresh-ads", "/api/growth/worker"]);
const assets = new Set(["/", "/ops", "/pilot", "/brief.css", "/brief-ui.js", "/brief-model.js", "/ops.js", "/office-handoffs.js", "/growth-ui.js", "/growth.css", "/md-visual.js", "/pixel.js", "/styles.css", "/app.js"]);
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
async function handle(req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const url = new URL(req.url), segments = (await context.params).path ?? [];
  if (url.host !== "aioffice.yuendeaw.com" || segments.some(p => !/^[A-Za-z0-9_.-]+$/.test(p))) return error("Not found", 404);
  const path = "/" + segments.join("/"), token = process.env.OFFICE_AI_BACKEND_TOKEN;
  if (!token) return error("AI Office is not configured", 503);
  try {
    // Existing unattended workers retain their original backend authentication.
    const supplied = req.headers.get("OAI-Sites-Authorization")?.replace(/^Bearer /, "");
    const service = !!supplied && Buffer.byteLength(supplied) === Buffer.byteLength(token) && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
    if (servicePaths.has(path) && service && !req.headers.has("origin")) {
      const forwardHeaders = new Headers({ "OAI-Sites-Authorization": `Bearer ${token}`, "content-type": "application/json" });
      for (const key of ["x-stand-direct", "x-stand-scheduler-key", "x-stand-dashboard-import", "x-stand-md-pilot"]) { const v = req.headers.get(key); if (v) forwardHeaders.set(key, v); }
      const body = req.method === "POST" ? await req.text() : undefined;
      if (body && body.length > 100000) return error("Request too large", 413);
      const result = await fetch(backend + path + url.search, { method: req.method, body, headers: forwardHeaders, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(55000) });
      return new Response(result.body, { status: result.status, headers: { "content-type": result.headers.get("content-type") ?? "application/json", "cache-control": "private, no-store" } });
    }
    if (!assets.has(path) && !/^\/api\/(ops|brief|growth|md-pilot)\//.test(path)) return error("Not found", 404);
    const identity = await getOfficeIdentity();
    if (!identity) {
      if (path.startsWith("/api/")) return error("Employee login required", 401);
      return NextResponse.redirect(new URL(`/auth/office/start?next=${encodeURIComponent(localReturnPath(path + url.search, "/ops"))}`, url.origin));
    }
    if (!identity.isOwner && (path === "/" || path === "/pilot")) return NextResponse.redirect(new URL("/ops", url.origin));
    if (!identity.isOwner && /^\/api\/(brief|growth|md-pilot)\//.test(path)) return error("Owner permission required", 403);
    if (req.method === "POST" && (req.headers.get("origin") !== url.origin || !req.headers.get("content-type")?.startsWith("application/json"))) return error("Invalid origin", 403);
    const body = req.method === "POST" ? await req.text() : "";
    if (body.length > 18000) return error("Request too large", 413);
    const secret = process.env.OFFICE_AI_BRIDGE_SECRET;
    if (!secret || secret.length < 43) return error("AI Office is not configured", 503);
    const stamp = String(Date.now()), payload = JSON.stringify({ requestId: randomUUID(), path: path + url.search, method: req.method, body, actor: { userId: identity.userId, employeeId: identity.employeeId, isOwner: identity.isOwner } });
    const signature = createHmac("sha256", secret).update(stamp + "." + payload).digest("hex");
    const result = await fetch(backend + "/api/office-bridge", { method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(55000), headers: { "content-type": "application/json", "OAI-Sites-Authorization": `Bearer ${token}`, "x-office-timestamp": stamp, "x-office-signature": signature }, body: payload });
    return new Response(result.body, { status: result.status, headers: { "content-type": result.headers.get("content-type") ?? "text/plain", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });
  } catch { return error("AI Office temporarily unavailable", 503); }
}
export const GET = handle;
export const POST = handle;
