import { createAdminClient } from "@/lib/supabase/admin";
import { emailShell, sendEmail, emailRow } from "@/lib/email";
import { ROLE_LABEL } from "@/lib/applications";

export const runtime = "nodejs";

// รับใบสมัครจากหน้า public (ไม่ต้องล็อกอิน) → status = new + อีเมลยืนยัน
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));

  const fullName = String(b.full_name || "").trim();
  const email = String(b.email || "").trim();
  if (!fullName || !email) return new Response("กรอกชื่อและอีเมลก่อน", { status: 400 });
  if (!b.consent_to_store_profile) return new Response("ต้องยินยอมให้เก็บข้อมูลก่อนส่ง", { status: 400 });

  const applicantType = b.applicant_type === "internship" ? "internship" : "full_time";

  const row: any = {
    kind: applicantType === "internship" ? "internship" : "job",
    applicant_type: applicantType,
    full_name: fullName,
    nickname: b.nickname || null,
    age: b.age ? Number(b.age) : null,
    email,
    phone: b.phone || null,
    line_id: b.line_id || null,
    location: b.location || null,
    work_type_pref: b.work_type_interest || null,
    current_status: b.current_status || null,
    available_date: b.available_start_date || null,
    expected_salary: b.expected_compensation || null,
    interested_roles: Array.isArray(b.interested_roles) ? b.interested_roles : [],
    resume_url: b.resume_url || null,
    portfolio_url: b.portfolio_url || null,
    portfolio_links: Array.isArray(b.portfolio_links) ? b.portfolio_links.filter(Boolean) : [],
    social_links: b.social_links && typeof b.social_links === "object" ? b.social_links : {},
    proud_works: Array.isArray(b.proud_works) ? b.proud_works : [],
    intro_video_url: b.intro_video_url || null,
    creative_answers: b.creative_answers && typeof b.creative_answers === "object" ? b.creative_answers : {},
    attitude_answers: b.attitude_answers && typeof b.attitude_answers === "object" ? b.attitude_answers : {},
    answers: b.answers && typeof b.answers === "object" ? b.answers : {},
    consent_to_store_profile: true,
    stage: "new",
  };

  const admin = createAdminClient();
  const { data, error } = await admin.from("applications").insert(row).select("id").single();
  if (error) return new Response(error.message, { status: 500 });

  // activity log
  await admin.from("audit_logs").insert({
    actor_email: email,
    action: "application_submitted",
    module: "applications",
    entity: "applications",
    entity_id: data.id,
    meta: { title: `${fullName} สมัคร${applicantType === "internship" ? "ฝึกงาน" : "พนักงาน"}` },
  });

  // แจ้งเตือนเจ้าของ (best-effort)
  const { data: owners } = await admin.from("app_users").select("id, email").eq("is_owner", true);
  if (owners?.length) {
    await admin.from("notifications").insert(
      owners.map((o: any) => ({
        user_id: o.id,
        title: "มีใบสมัครใหม่ ✨",
        body: `${fullName} · ${applicantType === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"}`,
        link: "/applications",
        kind: "application",
      }))
    );
  }

  // อีเมลยืนยันรับใบสมัคร (ส่งเมื่อตั้ง Resend)
  const roles = (Array.isArray(b.interested_roles) ? b.interested_roles : [])
    .map((r: string) => ROLE_LABEL[r] ?? r)
    .join(", ");
  const dataRows = [
    emailRow("ชื่อ-นามสกุล", `${fullName}${b.nickname ? ` (${b.nickname})` : ""}`),
    emailRow("ประเภท", applicantType === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"),
    roles ? emailRow("สายงานที่สนใจ", roles) : "",
    b.age ? emailRow("อายุ", `${b.age} ปี`) : "",
    applicantType !== "internship" && b.expected_compensation ? emailRow("ค่าตอบแทนที่คาดหวัง", String(b.expected_compensation)) : "",
  ].filter(Boolean).join("");

  const ownerEmails = (owners ?? []).map((o: any) => o.email).filter(Boolean);
  await sendEmail({
    to: email,
    replyTo: ownerEmails.length ? ownerEmails : undefined,
    subject: "ขอบคุณที่ส่งใบสมัครมาที่ ยืนเดี่ยว 💛",
    html: emailShell(`
      <h2 style="margin:0 0 10px">ขอบคุณที่ตั้งใจส่งใบสมัครมาที่ บริษัท ยืนเดี่ยว จำกัด 💛</h2>
      <p><b>YuenDeaw People</b> เป็นองค์กรขนาดเล็ก ที่เชื่อว่าการได้ทำงานกับ “คนที่ใช่” เป็นส่วนหนึ่งของการพัฒนาชีวิตให้ก้าวหน้า และสมดุลไปกับเรื่องอื่น ๆ — เราจึงขอบคุณมากที่คุณสนใจส่งใบสมัครเข้ามาหาเรา</p>
      <p>ระบบได้บันทึกข้อมูลของคุณเรียบร้อยแล้ว:</p>
      <table style="font-size:15px;margin:8px 0 16px">${dataRows}</table>
      <p>หากทางบริษัทมีตำแหน่งงานตรงกับที่คุณระบุไว้ <b>เราจะติดต่อกลับเพื่อนัดสัมภาษณ์</b></p>
      <p style="color:#8A6800">ขอบคุณที่แบ่งปันตัวตน ผลงาน และความตั้งใจของคุณมาให้เราเห็นนะครับ 💛</p>
    `),
  });

  return Response.json({ ok: true });
}
