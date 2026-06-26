import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// น้องฝึกเขียนบันทึกประจำวัน (1 วัน/1 บันทึก) — เขียน/แก้ของตัวเองได้
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim();
  if (!content) return new Response("กรุณาเขียนบันทึก", { status: 400 });

  const canManageOthers = ctx.isOwner || can(ctx, "people", "edit");
  const internId = canManageOthers && body.intern_id ? String(body.intern_id) : ctx.employeeId;
  if (!internId) return new Response("no employee", { status: 400 });

  const logDate = String(body.log_date || new Date().toISOString().slice(0, 10));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("intern_logs")
    .upsert({ intern_id: internId, log_date: logDate, content }, { onConflict: "intern_id,log_date" })
    .select("id, log_date, content, created_at")
    .single();
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ ok: true, log: data });
}
