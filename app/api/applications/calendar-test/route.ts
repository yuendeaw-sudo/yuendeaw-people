import { getAccessContext } from "@/lib/auth";
import { diagnose } from "@/lib/google-calendar";

export const runtime = "nodejs";

// ตรวจสอบการเชื่อม Google Calendar (owner เท่านั้น) — เปิดในเบราว์เซอร์ตอนล็อกอิน owner
export async function GET() {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("forbidden", { status: 403 });
  const result = await diagnose();
  return Response.json(result);
}
