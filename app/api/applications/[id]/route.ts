import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL } from "@/lib/applications";
import { googleCalendarConfigured, createInterviewEvent, addOneHour } from "@/lib/google-calendar";
import { formatThaiDate } from "@/lib/utils";
import { emailShell, emailButton, emailRow, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com";

function locLabel(v: string) {
  return v === "Google Meet" ? "ออนไลน์ (Google Meet)"
    : v === "On-site" ? "ที่ออฟฟิศ YuenDeaw"
    : v === "Phone" ? "ทางโทรศัพท์" : (v || "-");
}
function ivRows(iv: any) {
  const timeStr = [iv.start, iv.end].filter(Boolean).join(" - ");
  return [
    emailRow("รอบสัมภาษณ์", iv.type || "สัมภาษณ์งาน"),
    iv.date ? emailRow("วันที่", formatThaiDate(iv.date)) : "",
    timeStr ? emailRow("เวลา", `${timeStr} น.`) : "",
    emailRow("รูปแบบ", locLabel(iv.location)),
  ].filter(Boolean).join("");
}

// Template 2 — ถึงผู้สมัคร (นัดสัมภาษณ์)
async function sendInterviewEmail(ap: any, iv: any, replyTo?: string[]) {
  if (!ap?.email) return;
  const name = ap.nickname || ap.full_name || "";
  const meetBtn = iv.meet_url ? `<p style="margin:16px 0">${emailButton(iv.meet_url, "🎥 เข้าห้อง Google Meet", true)}</p>` : "";
  const notes = iv.notes_for_candidate ? `<p style="color:#555">📝 ${iv.notes_for_candidate}</p>` : "";
  await sendEmail({
    to: ap.email,
    replyTo: replyTo && replyTo.length ? replyTo : undefined,
    subject: "อยากชวนคุณมาสัมภาษณ์กับ ยืนเดี่ยว 🎤",
    html: emailShell(`
      <h2 style="margin:0 0 10px">สวัสดี ${name} 🎤</h2>
      <p>จากประวัติและผลงานที่คุณนำเสนอ ทีมยืนเดี่ยว <b>เห็น potential ในตัวคุณเป็นอย่างมาก</b> และอยากชวนคุณมาสัมภาษณ์ เพื่อนำเสนอ portfolio ของคุณกับทีมงานของเรา</p>
      <table style="font-size:15px;margin:8px 0 4px">${ivRows(iv)}</table>
      ${meetBtn}
      ${notes}
      <p><b>YuenDeaw People</b> เป็นองค์กรขนาดเล็ก ที่เชื่อว่าการได้ทำงานกับ “คนที่ใช่” เป็นส่วนหนึ่งของการพัฒนาชีวิตให้ก้าวหน้าและสมดุลไปกับเรื่องอื่น ๆ การคัดเลือกของเรายึดหลัก <b>“ความพึงพอใจร่วมกัน”</b> — คุณเองก็มีสิทธิ์เลือกที่จะเข้าสัมภาษณ์ และเลือกว่าจะร่วมงานกับเราหรือไม่ เช่นเดียวกับที่เราเลือกคุณ</p>
      <p style="background:#FFF7DB;border-radius:10px;padding:12px 14px"><b>🙏 รบกวนตอบกลับอีเมลฉบับนี้ เพื่อยืนยันการเข้าสัมภาษณ์</b></p>
      <p style="color:#8A6800">อีกไม่นานเจอกันนะครับ 💛</p>
    `),
  });
}

// Template 3 — ถึงทีม (owner + ผู้สัมภาษณ์) พร้อมโปรไฟล์ผู้สมัคร + resume/portfolio
async function sendInterviewTeamEmail(emails: string[], ap: any, iv: any, appId: string, roleText: string) {
  const meetBtn = iv.meet_url ? emailButton(iv.meet_url, "🎥 Google Meet", true) : "";
  const resumeBtn = ap?.resume_url ? emailButton(ap.resume_url, "📄 Resume") : "";
  const portBtn = ap?.portfolio_url ? emailButton(ap.portfolio_url, "🎨 Portfolio") : "";
  const videoBtn = ap?.intro_video_url ? emailButton(ap.intro_video_url, "🎬 คลิปแนะนำตัว") : "";
  const appBtn = emailButton(`${SITE}/applications/${appId}`, "👤 เปิดโปรไฟล์เต็ม");
  const contact = [ap?.email, ap?.phone].filter(Boolean).join(" · ");
  const rows = [
    emailRow("ผู้สมัคร", `${ap?.full_name || "-"}${ap?.nickname ? ` (${ap.nickname})` : ""}`),
    emailRow("ประเภท", ap?.applicant_type === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"),
    ap?.age ? emailRow("อายุ", `${ap.age} ปี`) : "",
    roleText ? emailRow("สายงานที่สนใจ", roleText) : "",
    contact ? emailRow("ติดต่อ", contact) : "",
    "",
    ...ivRows(iv).split("</tr>").filter(Boolean).map((s) => s + "</tr>"),
  ].filter(Boolean).join("");
  await sendEmail({
    to: emails,
    subject: `นัดสัมภาษณ์: ${ap?.nickname || ap?.full_name || "ผู้สมัคร"} 🗓️`,
    html: emailShell(`
      <h2 style="margin:0 0 10px">มีนัดสัมภาษณ์ที่คุณเกี่ยวข้อง 🗓️</h2>
      ${ap?.photo_url ? `<div style="text-align:center;margin:4px 0 16px"><img src="${ap.photo_url}" alt="" width="128" height="128" style="border-radius:16px;object-fit:cover;border:1px solid #eee"/></div>` : ""}
      <table style="font-size:15px;margin:8px 0 14px">${rows}</table>
      ${ap?.hr_summary ? `<p style="background:#f6f6f6;border-radius:10px;padding:10px 14px;font-size:14px"><b>สรุปจาก HR:</b> ${ap.hr_summary}</p>` : ""}
      <p style="margin:16px 0">${meetBtn}${resumeBtn}${portBtn}${videoBtn}${appBtn}</p>
    `),
  });
}

// จัดการใบสมัคร: hr screening / owner decision / เปลี่ยนสถานะ / นัดสัมภาษณ์
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  const canEdit = ctx.isOwner || can(ctx, "applications", "edit");
  if (!canEdit) return new Response("forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = createAdminClient();
  const patch: any = { updated_at: new Date().toISOString() };
  let logAction = "application_updated";
  let logTitle = "";

  if (action === "screen") {
    // HR ใส่คะแนน/แท็ก/สรุป
    if (body.hr_score !== undefined) patch.hr_score = body.hr_score;
    if (body.hr_recommendation !== undefined) patch.hr_recommendation = body.hr_recommendation;
    if (body.hr_summary !== undefined) patch.hr_summary = body.hr_summary;
    if (body.strengths !== undefined) patch.strengths = body.strengths;
    if (body.concerns !== undefined) patch.concerns = body.concerns;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.internal_notes !== undefined) patch.internal_notes = body.internal_notes;
    if (body.score !== undefined) patch.score = body.score;
    logAction = "application_screened";
    logTitle = "HR คัดกรอง/ให้คะแนน";
  } else if (action === "owner") {
    patch.owner_decision = body.owner_decision || null;
    if (body.owner_note !== undefined) patch.owner_note = body.owner_note;
    logAction = "owner_decision";
    logTitle = `Owner: ${body.owner_decision || "-"}`;
  } else if (action === "status") {
    if (!body.stage) return new Response("stage required", { status: 400 });
    patch.stage = body.stage;
    logAction = "status_changed";
    logTitle = `เปลี่ยนสถานะ → ${body.stage}`;
  } else if (action === "interview") {
    // นัดสัมภาษณ์ — สร้าง Google Calendar event + Meet จริง (ถ้าตั้ง env แล้ว) ไม่งั้น fallback mock
    const iv = body.interview || {};
    // ข้อมูลผู้สมัคร (ใช้ทั้งสร้าง event + ส่งอีเมลยืนยัน)
    const { data: ap } = await admin
      .from("applications")
      .select("full_name, nickname, email, phone, age, photo_url, applicant_type, interested_roles, resume_url, portfolio_url, intro_video_url, hr_summary")
      .eq("id", id)
      .maybeSingle();
    const roleText = (ap?.interested_roles ?? []).map((r: string) => ROLE_LABEL[r] ?? r).join(", ");

    // ผู้สัมภาษณ์ที่ถูก tag (อีเมล + user_id สำหรับแจ้งเตือน)
    const ivIds = Array.isArray(iv.interviewers) ? iv.interviewers : [];
    const { data: ivEmps } = ivIds.length
      ? await admin.from("employees").select("email, user_id").in("id", ivIds)
      : { data: [] as any[] };
    const interviewerEmails = (ivEmps ?? []).map((e: any) => e.email).filter(Boolean);

    if (iv.location === "Google Meet" && !iv.meet_url) {
      let real: { meetUrl: string | null; htmlLink: string | null; eventId: string | null } | null = null;
      if (googleCalendarConfigured() && iv.date) {
        const roles = (ap?.interested_roles ?? []).map((r: string) => ROLE_LABEL[r] ?? r).join(", ");
        const startISO = `${iv.date}T${(iv.start || "10:00")}:00`;
        const endISO = `${iv.date}T${(iv.end || addOneHour(iv.start || "10:00"))}:00`;
        const summary = `สัมภาษณ์งาน YuenDeaw - ${ap?.full_name || ""}${roles ? ` - ${roles}` : ""}`;
        const description = [
          `ผู้สมัคร: ${ap?.full_name || "-"}`,
          `ประเภท: ${ap?.applicant_type === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"}`,
          roles ? `สายงานที่สนใจ: ${roles}` : "",
          ap?.portfolio_url ? `Portfolio: ${ap.portfolio_url}` : "",
          ap?.intro_video_url ? `คลิปแนะนำตัว: ${ap.intro_video_url}` : "",
          ap?.hr_summary ? `สรุปจาก HR: ${ap.hr_summary}` : "",
          iv.notes_for_candidate ? `หมายเหตุ: ${iv.notes_for_candidate}` : "",
        ].filter(Boolean).join("\n");
        real = await createInterviewEvent({
          summary,
          description,
          startISO,
          endISO,
          attendees: [ap?.email, ...interviewerEmails].filter(Boolean) as string[],
        });
      }
      if (real?.meetUrl) {
        iv.meet_url = real.meetUrl;
        iv.calendar_event_id = real.eventId;
        iv.calendar_link = real.htmlLink;
        iv.mock = false;
      } else {
        const rand = id.slice(0, 3) + Math.abs(hashStr(id + (iv.date || ""))).toString(36).slice(0, 8);
        iv.meet_url = `https://meet.google.com/${rand.slice(0, 3)}-${rand.slice(3, 7)}-${rand.slice(7, 10)}`;
        iv.calendar_event_id = `mock_${id.slice(0, 8)}`;
        iv.mock = true;
      }
    }
    patch.interview = iv;
    patch.stage = "interview_scheduled";
    logAction = "interview_scheduled";
    logTitle = `นัดสัมภาษณ์ ${iv.date || ""} ${iv.start || ""}`.trim();

    // owner (ใช้เป็น reply-to ของผู้สมัคร + ผู้รับอีเมลทีม + แจ้งเตือน)
    const { data: owners } = await admin.from("app_users").select("id, email").eq("is_owner", true);
    const ownerEmails = (owners ?? []).map((o: any) => o.email).filter(Boolean);

    // อีเมลนัดถึงผู้สมัคร (reply กลับไปหา owner) — ทุกรูปแบบ ไม่ใช่แค่ Meet
    await sendInterviewEmail(ap, iv, ownerEmails);

    // อีเมลถึงทีม: owner + ผู้สัมภาษณ์ที่ถูก tag
    await sendInterviewTeamEmail([...interviewerEmails, ...ownerEmails], ap, iv, id, roleText);

    const notifUserIds = [
      ...new Set([
        ...(ivEmps ?? []).map((e: any) => e.user_id).filter(Boolean),
        ...(owners ?? []).map((o: any) => o.id),
      ]),
    ];
    if (notifUserIds.length) {
      await admin.from("notifications").insert(
        notifUserIds.map((uid) => ({
          user_id: uid,
          title: "มีนัดสัมภาษณ์ 🗓️",
          body: `${ap?.nickname || ap?.full_name || "ผู้สมัคร"} · ${formatThaiDate(iv.date)}${iv.start ? ` ${iv.start} น.` : ""}`,
          link: `/applications/${id}`,
          kind: "interview",
        }))
      );
    }
  } else {
    return new Response("unknown action", { status: 400 });
  }

  const { error } = await admin.from("applications").update(patch).eq("id", id);
  if (error) return new Response(error.message, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    action: logAction,
    module: "applications",
    entity: "applications",
    entity_id: id,
    meta: { title: logTitle },
  });

  return Response.json({ ok: true, interview: patch.interview });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
