import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL } from "@/lib/applications";
import { googleCalendarConfigured, createInterviewEvent, addOneHour } from "@/lib/google-calendar";

export const runtime = "nodejs";

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
    if (iv.location === "Google Meet" && !iv.meet_url) {
      let real: { meetUrl: string | null; htmlLink: string | null; eventId: string | null } | null = null;
      if (googleCalendarConfigured() && iv.date) {
        const { data: ap } = await admin
          .from("applications")
          .select("full_name, email, applicant_type, interested_roles, portfolio_url, intro_video_url, hr_summary")
          .eq("id", id)
          .maybeSingle();
        const ivIds = Array.isArray(iv.interviewers) ? iv.interviewers : [];
        const { data: ivEmps } = ivIds.length
          ? await admin.from("employees").select("email").in("id", ivIds)
          : { data: [] as any[] };
        const interviewerEmails = (ivEmps ?? []).map((e: any) => e.email).filter(Boolean);
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
