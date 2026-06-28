import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// เหตุผลการออก → label (เก็บลง audit ให้อ่านง่าย)
const EXIT_REASON_LABEL: Record<string, string> = {
  resigned: "ลาออกเอง",
  failed_probation: "ไม่ผ่านทดลองงาน",
  terminated: "ถูกให้ออก / เลิกจ้าง",
  to_freelance: "ออกไปเป็นฟรีแลนซ์",
  internship_completed: "จบฝึกงานตามกำหนด",
};

// แปลงรูปแบบการจ้าง → สถานะที่ควรเป็น
const CONVERT_STATUS: Record<string, string> = {
  full_time: "active",
  freelance: "freelance",
  intern: "intern",
};
const CONVERT_LABEL: Record<string, string> = {
  full_time: "พนักงานประจำ",
  freelance: "ฟรีแลนซ์",
  intern: "ฝึกงานต่อ",
};

// owner เท่านั้น: ออกจากงาน (alumni) / แปลงสถานะเด็กฝึก / คืนสถานะ
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner) return new Response("เฉพาะเจ้าของเท่านั้น", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "");
  const action = String(body.action || "");
  if (!employeeId) return new Response("employeeId required", { status: 400 });

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const log = (action: string, meta: Record<string, any>) =>
    admin.from("audit_logs").insert({
      actor_id: ctx.userId,
      actor_email: ctx.email,
      action,
      module: "people",
      entity: "employees",
      entity_id: employeeId,
      meta,
    });

  if (action === "offboard") {
    const reason = String(body.reason || "");
    if (!(reason in EXIT_REASON_LABEL)) return new Response("เหตุผลไม่ถูกต้อง", { status: 400 });
    const note = body.note ? String(body.note).trim() : null;
    const endDate = body.end_date || today;
    // เก็บเหตุผล/หมายเหตุไว้ใน audit log (ด้านล่าง) — ไม่ต้องพึ่งคอลัมน์เพิ่ม
    const { error } = await admin
      .from("employees")
      .update({ status: "alumni", end_date: endDate })
      .eq("id", employeeId);
    if (error) return new Response(error.message, { status: 500 });
    await log("offboard", { title: EXIT_REASON_LABEL[reason], reason, note, end_date: endDate });
    return Response.json({ ok: true });
  }

  if (action === "convert") {
    const toKey = String(body.toKey || "");
    if (!(toKey in CONVERT_STATUS)) return new Response("ประเภทไม่ถูกต้อง", { status: 400 });
    const { data: et } = await admin
      .from("employment_types")
      .select("id, name")
      .eq("key", toKey)
      .maybeSingle();
    if (!et) return new Response("ไม่พบรูปแบบการจ้าง", { status: 400 });
    const { error } = await admin
      .from("employees")
      .update({
        employment_type_id: et.id,
        status: CONVERT_STATUS[toKey],
        end_date: null,
      })
      .eq("id", employeeId);
    if (error) return new Response(error.message, { status: 500 });
    await log("convert_employment", { title: CONVERT_LABEL[toKey], toKey, toName: et.name });
    return Response.json({ ok: true });
  }

  if (action === "reactivate") {
    const { error } = await admin
      .from("employees")
      .update({ status: "active", end_date: null })
      .eq("id", employeeId);
    if (error) return new Response(error.message, { status: 500 });
    await log("reactivate", { title: "นำกลับเข้าทำงาน" });
    return Response.json({ ok: true });
  }

  return new Response("unknown action", { status: 400 });
}
