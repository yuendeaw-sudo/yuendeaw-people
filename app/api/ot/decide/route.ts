import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { OT_TYPE_LABEL, otRate } from "@/lib/ot";
import { formatThaiDate } from "@/lib/utils";

export const runtime = "nodejs";

// อนุมัติ / ปฏิเสธ OT — เจ้าของ หรือ ผู้มีสิทธิ์อนุมัติการลา
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner && !can(ctx, "time_leave", "approve"))
    return new Response("ไม่มีสิทธิ์อนุมัติ OT", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !["approved", "rejected"].includes(status))
    return new Response("ข้อมูลไม่ถูกต้อง", { status: 400 });

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("ot_requests")
    .update({
      status,
      decided_by: ctx.userId,
      decided_at: new Date().toISOString(),
      reviewer_comment: body.comment ? String(body.comment).trim() : null,
    })
    .eq("id", id)
    .eq("status", "pending") // กันกดซ้ำ
    .select("employee_id, ot_type, work_date, amount")
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });
  if (!row) return new Response("ไม่พบคำขอ หรือถูกตัดสินไปแล้ว", { status: 404 });

  // ตอนอนุมัติ: คิดเงินจากเรต OT ล่าสุดของพนักงาน (owner อาจเพิ่งตั้ง/ปรับ)
  const { data: emp } = await admin
    .from("employees")
    .select("user_id, ot_rate")
    .eq("id", row.employee_id)
    .maybeSingle();
  let amount = Number(row.amount);
  if (status === "approved") {
    amount = otRate((emp as any)?.ot_rate);
    await admin.from("ot_requests").update({ amount }).eq("id", id);
  }
  if (emp?.user_id) {
    await admin.from("notifications").insert({
      user_id: emp.user_id,
      title: status === "approved" ? "อนุมัติ OT แล้ว ✅" : "OT ไม่ได้รับอนุมัติ",
      body: `${OT_TYPE_LABEL[row.ot_type] ?? "OT"} · ${formatThaiDate(row.work_date)}${
        status === "approved" ? ` · ${amount.toLocaleString()} บาท` : ""
      }`,
      link: "/time-leave",
      kind: "ot",
    });
  }

  return Response.json({ ok: true });
}
