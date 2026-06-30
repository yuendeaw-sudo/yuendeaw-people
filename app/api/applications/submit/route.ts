import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com";

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
  const { data: owners } = await admin.from("app_users").select("id").eq("is_owner", true);
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

  // อีเมลยืนยันผู้สมัคร (ส่งเมื่อมี Resend)
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (key && from) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: email,
          subject: "ได้รับใบสมัครของคุณแล้ว — YuenDeaw Talent Pool 💛",
          html: `<div style="font-family:sans-serif;line-height:1.8;color:#1a1a1a;max-width:520px">
            <h2>สวัสดี ${b.nickname || fullName} 🎉</h2>
            <p>เราได้รับใบสมัครของคุณแล้ว ทีมยืนเดี่ยวจะเก็บโปรไฟล์นี้ไว้ใน <b>People OS Talent Pool</b></p>
            <p>เมื่อมีตำแหน่งหรือโปรเจกต์ที่เหมาะ เราจะติดต่อกลับ</p>
            <p style="color:#8A6800">ขอบคุณที่ส่งตัวตน ผลงาน และความตั้งใจของคุณมาให้เราเห็น 💛</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
            <p style="font-size:13px;color:#888">YuenDeaw · <a href="${SITE}">${SITE}</a></p>
          </div>`,
        }),
      });
    } catch {
      /* email best-effort */
    }
  }

  return Response.json({ ok: true });
}
