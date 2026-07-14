import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL } from "@/lib/applications";
import { googleCalendarConfigured, createInterviewEvent, addOneHour } from "@/lib/google-calendar";
import { formatThaiDate } from "@/lib/utils";

export const runtime = "nodejs";

// อีเมลยืนยันนัดสัมภาษณ์ถึงผู้สมัคร (best-effort — ส่งเมื่อตั้ง Resend)
async function sendInterviewEmail(ap: any, iv: any) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from || !ap?.email) return;
  const loc =
    iv.location === "Google Meet" ? "ออนไลน์ (Google Meet)" :
    iv.location === "On-site" ? "ที่ออฟฟิศ YuenDeaw" :
    iv.location === "Phone" ? "ทางโทรศัพท์" : (iv.location || "-");
  const timeStr = [iv.start, iv.end].filter(Boolean).join(" - ");
  const row = (l: string, v: string) => `<tr><td style="padding:5px 14px 5px 0;color:#888;white-space:nowrap">${l}</td><td><b>${v}</b></td></tr>`;
  const rows = [
    row("ประเภท", iv.type || "สัมภาษณ์งาน"),
    iv.date ? row("วันที่", formatThaiDate(iv.date)) : "",
    timeStr ? row("เวลา", `${timeStr} น.`) : "",
    row("รูปแบบ", loc),
  ].filter(Boolean).join("");
  const meetBtn = iv.meet_url
    ? `<p style="margin:16px 0"><a href="${iv.meet_url}" style="display:inline-block;background:#F7BE00;color:#1a1a1a;padding:11px 20px;border-radius:12px;text-decoration:none;font-weight:bold">🎥 เข้าห้อง Google Meet</a></p>`
    : "";
  const notes = iv.notes_for_candidate ? `<p style="color:#555">📝 ${iv.notes_for_candidate}</p>` : "";
  const name = ap.nickname || ap.full_name || "";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: ap.email,
        subject: "นัดสัมภาษณ์กับ YuenDeaw 🎤",
        html: `<div style="font-family:sans-serif;line-height:1.8;color:#1a1a1a;max-width:520px">
          <h2>สวัสดี ${name} 🎉</h2>
          <p>ทีมยืนเดี่ยวได้นัดสัมภาษณ์คุณแล้ว รายละเอียดตามนี้:</p>
          <table style="font-size:15px;margin:8px 0">${rows}</table>
          ${meetBtn}
          ${notes}
          <p style="color:#8A6800">อีกไม่นานเจอกันนะครับ 💛</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="font-size:13px;color:#888">YuenDeaw · People OS</p>
        </div>`,
      }),
    });
  } catch {
    /* best-effort */
  }
}

// อีเมลถึงทีม (owner + ผู้สัมภาษณ์ที่ถูก tag) — พร้อมข้อมูลผู้สมัคร + ปุ่มเปิดใบสมัคร
async function sendInterviewTeamEmail(emails: string[], ap: any, iv: any, appId: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = [...new Set(emails.filter(Boolean))];
  if (!key || !from || to.length === 0) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com";
  const loc =
    iv.location === "Google Meet" ? "ออนไลน์ (Google Meet)" :
    iv.location === "On-site" ? "ที่ออฟฟิศ YuenDeaw" :
    iv.location === "Phone" ? "ทางโทรศัพท์" : (iv.location || "-");
  const timeStr = [iv.start, iv.end].filter(Boolean).join(" - ");
  const row = (l: string, v: string) => `<tr><td style="padding:5px 14px 5px 0;color:#888;white-space:nowrap">${l}</td><td><b>${v}</b></td></tr>`;
  const rows = [
    row("ผู้สมัคร", `${ap?.full_name || "-"}${ap?.nickname ? ` (${ap.nickname})` : ""}`),
    row("ประเภท", ap?.applicant_type === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"),
    row("รอบ", iv.type || "สัมภาษณ์"),
    iv.date ? row("วันที่", formatThaiDate(iv.date)) : "",
    timeStr ? row("เวลา", `${timeStr} น.`) : "",
    row("รูปแบบ", loc),
  ].filter(Boolean).join("");
  const meetBtn = iv.meet_url
    ? `<a href="${iv.meet_url}" style="display:inline-block;background:#F7BE00;color:#1a1a1a;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;margin-right:8px">🎥 Google Meet</a>`
    : "";
  const appBtn = `<a href="${site}/applications/${appId}" style="display:inline-block;background:#eee;color:#1a1a1a;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">📄 เปิดใบสมัคร</a>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `นัดสัมภาษณ์: ${ap?.nickname || ap?.full_name || "ผู้สมัคร"} 🗓️`,
        html: `<div style="font-family:sans-serif;line-height:1.8;color:#1a1a1a;max-width:520px">
          <h2>มีนัดสัมภาษณ์ที่คุณเกี่ยวข้อง 🗓️</h2>
          <table style="font-size:15px;margin:8px 0">${rows}</table>
          <p style="margin:16px 0">${meetBtn}${appBtn}</p>
          <p style="font-size:13px;color:#888">YuenDeaw · People OS</p>
        </div>`,
      }),
    });
  } catch {
    /* best-effort */
  }
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
      .select("full_name, nickname, email, applicant_type, interested_roles, portfolio_url, intro_video_url, hr_summary")
      .eq("id", id)
      .maybeSingle();

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

    // อีเมลยืนยันนัดถึงผู้สมัคร (ทุกรูปแบบ ไม่ใช่แค่ Meet)
    await sendInterviewEmail(ap, iv);

    // อีเมล + แจ้งเตือนถึงทีม: owner + ผู้สัมภาษณ์ที่ถูก tag
    const { data: owners } = await admin.from("app_users").select("id, email").eq("is_owner", true);
    const teamEmails = [
      ...interviewerEmails,
      ...(owners ?? []).map((o: any) => o.email).filter(Boolean),
    ];
    await sendInterviewTeamEmail(teamEmails, ap, iv, id);

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
