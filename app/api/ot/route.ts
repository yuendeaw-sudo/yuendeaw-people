import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { otRate, OT_TYPE_LABEL } from "@/lib/ot";

export const runtime = "nodejs";

// พนักงานเขียนเบิก OT (สถานะ pending รออนุมัติ)
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.employeeId) return new Response("ไม่พบข้อมูลพนักงานของคุณ", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const workDate = String(body.workDate || "");
  const otType = String(body.otType || "");
  const reason = body.reason ? String(body.reason).trim() : "";
  const hours = Number(body.hours);
  if (!workDate) return new Response("เลือกวันที่ก่อนนะ", { status: 400 });
  if (!(otType in OT_TYPE_LABEL)) return new Response("ประเภท OT ไม่ถูกต้อง", { status: 400 });
  if (!reason) return new Response("กรอกรายละเอียดงานก่อนนะ", { status: 400 });
  if (!hours || hours <= 0) return new Response("กรอกจำนวนชั่วโมง", { status: 400 });

  const admin = createAdminClient();
  // เรตของพนักงานคนนี้ (owner ตั้งจากหน้าโปรไฟล์) — snapshot ไว้ตอนยื่น
  const { data: emp } = await admin.from("employees").select("ot_rate").eq("id", ctx.employeeId).maybeSingle();
  const { error } = await admin.from("ot_requests").insert({
    employee_id: ctx.employeeId,
    work_date: workDate,
    ot_type: otType,
    amount: otRate((emp as any)?.ot_rate),
    hours,
    reason,
    status: "pending",
  });
  if (error) return new Response(error.message, { status: 500 });

  // แจ้งผู้อนุมัติ (เจ้าของ) — ผู้มีสิทธิ์อนุมัติลาคนอื่นเห็นคิวในหน้า เวลา&การลา อยู่แล้ว
  const { data: owners } = await admin.from("app_users").select("id").eq("is_owner", true);
  const targets = [...new Set((owners ?? []).map((o: any) => o.id))];
  if (targets.length) {
    await admin.from("notifications").insert(
      targets.map((uid) => ({
        user_id: uid,
        title: "มีคำขอเบิก OT ใหม่ 🕒",
        body: `${ctx.fullName || "พนักงาน"} · ${OT_TYPE_LABEL[otType]}`,
        link: "/time-leave",
        kind: "ot",
      }))
    );
  }

  return Response.json({ ok: true });
}
