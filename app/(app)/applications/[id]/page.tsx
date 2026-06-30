import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, Badge, Card, PageHeader, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import {
  statusOf, ROLE_LABEL, HR_RECOMMENDATION, HR_SCORE_FIELDS,
  SOCIAL_KEYS, questionsFor,
} from "@/lib/applications";
import { ApplicationActions } from "@/components/applications/ApplicationActions";

function ytEmbed(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "applications", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = ctx.isOwner || can(ctx, "applications", "edit");

  const { data: a } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (!a) return <div><PageHeader title="ไม่พบใบสมัคร" icon="FileX" /><EmptyState icon="FileX" title="ไม่พบใบสมัครนี้" /></div>;

  const [{ data: emps }, { data: teams }] = await Promise.all([
    supabase.from("employees").select("id, first_name, nickname, status, employment_types(key)").order("first_name"),
    supabase.from("teams").select("id, name").order("name"),
  ]);
  const employees = (emps ?? []).filter((e: any) => !["alumni", "inactive"].includes(e.status)).map((e: any) => ({ id: e.id, name: e.nickname || e.first_name }));
  const teamOpts = (teams ?? []).map((t: any) => ({ id: t.id, name: t.name }));

  let logs: any[] = [];
  if (canEdit) {
    const admin = createAdminClient();
    const { data } = await admin.from("audit_logs").select("action, actor_email, meta, created_at").eq("entity_id", id).order("created_at", { ascending: false }).limit(20);
    logs = data ?? [];
  }

  const st = statusOf(a.stage);
  const rec = HR_RECOMMENDATION.find((r) => r.key === a.hr_recommendation);
  const Q = questionsFor(a.applicant_type);
  const edu = a.answers ?? {};
  const embed = ytEmbed(a.intro_video_url);
  const social = a.social_links ?? {};
  const portfolioLinks = a.portfolio_links ?? [];

  return (
    <div>
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> ย้อนกลับ: ใบสมัคร
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* LEFT: one-page summary */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <div className="flex items-start gap-4">
              <Avatar name={a.nickname || a.full_name} size={64} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{a.full_name}{a.nickname && <span className="text-muted font-medium"> ({a.nickname})</span>}</h1>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {rec && <Badge tone={rec.tone}>HR: {rec.label}</Badge>}
                </div>
                <div className="text-sm text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{a.applicant_type === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"}</span>
                  {a.age && <span>{a.age} ปี</span>}
                  {a.location && <span>{a.location}</span>}
                  {a.available_date && <span>เริ่มได้ {formatThaiDate(a.available_date)}</span>}
                  {a.expected_salary && <span>💰 {a.expected_salary}</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(a.interested_roles ?? []).map((r: string) => <span key={r} className="chip bg-sand text-muted text-[11px]">{ROLE_LABEL[r] ?? r}</span>)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  {a.phone && <span className="text-muted">📞 {a.phone}</span>}
                  {a.email && <a href={`mailto:${a.email}`} className="text-gold hover:underline">✉️ {a.email}</a>}
                  {a.line_id && <span className="text-muted">LINE: {a.line_id}</span>}
                </div>
                {a.applicant_type === "internship" && (edu.university || edu.faculty || edu.internship_months) && (
                  <div className="mt-2 text-xs text-muted flex flex-wrap gap-x-3 gap-y-0.5">
                    <Icon name="GraduationCap" className="size-3.5 text-grape" />
                    {edu.university && <span>{edu.university}</span>}
                    {edu.faculty && <span>· {edu.faculty}</span>}
                    {edu.internship_months && <span>· ฝึก {edu.internship_months} เดือน</span>}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* intro video */}
          {a.intro_video_url && (
            <Card>
              <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="Video" className="size-4 text-gold" /> คลิปแนะนำตัว</h3>
              {embed ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-ink">
                  <iframe src={embed} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <a href={a.intro_video_url} target="_blank" rel="noreferrer" className="btn-brand"><Icon name="Play" className="size-4" /> เปิดคลิปแนะนำตัว</a>
              )}
            </Card>
          )}

          {/* portfolio + social */}
          <Card>
            <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="Link" className="size-4 text-gold" /> ผลงาน & โซเชียล</h3>
            <div className="flex flex-wrap gap-2">
              {a.resume_url && <LinkChip href={a.resume_url} label="Resume" icon="FileText" />}
              {a.portfolio_url && <LinkChip href={a.portfolio_url} label="Portfolio" icon="Briefcase" />}
              {portfolioLinks.map((l: string, i: number) => l && <LinkChip key={i} href={l} label={`ผลงาน ${i + 1}`} icon="Link" />)}
              {SOCIAL_KEYS.map((s) => social[s.key] && <LinkChip key={s.key} href={social[s.key]} label={s.label} icon="Globe" />)}
            </div>
            {(a.proud_works ?? []).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted">ผลงานที่ภูมิใจ</p>
                {(a.proud_works ?? []).map((p: any, i: number) => (
                  <div key={i} className="rounded-xl bg-sand/40 p-3 text-sm">
                    <div className="font-medium">{p.title}</div>
                    {p.why && <div className="text-muted text-xs mt-0.5 italic">“{p.why}”</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* answers */}
          <Card>
            <h3 className="font-bold mb-3">{Q.primaryLabel}{Q.attitude.length > 0 ? " & ทัศนคติ" : ""}</h3>
            <div className="space-y-3">
              {Q.primary.map((q, i) => (a.creative_answers?.[`q${i + 1}`]) && (
                <QA key={`c${i}`} q={q} ans={a.creative_answers[`q${i + 1}`]} />
              ))}
              {Q.attitude.map((q, i) => (a.attitude_answers?.[`q${i + 1}`]) && (
                <QA key={`a${i}`} q={q} ans={a.attitude_answers[`q${i + 1}`]} />
              ))}
            </div>
          </Card>

          {/* HR summary (for owner one-page) */}
          {(a.hr_summary || (a.strengths ?? []).length || (a.concerns ?? []).length) && (
            <Card className="border-amber-soft">
              <h3 className="font-bold mb-2 flex items-center gap-2"><Icon name="ClipboardCheck" className="size-4 text-gold" /> สรุปจาก HR</h3>
              {a.hr_summary && <p className="text-sm mb-2">{a.hr_summary}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                {(a.strengths ?? []).length > 0 && (
                  <div><p className="text-xs font-semibold text-mint mb-1">จุดเด่น</p><ul className="text-sm list-disc ml-4 space-y-0.5">{a.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                )}
                {(a.concerns ?? []).length > 0 && (
                  <div><p className="text-xs font-semibold text-rose mb-1">ข้อกังวล</p><ul className="text-sm list-disc ml-4 space-y-0.5">{a.concerns.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                )}
              </div>
              {Object.keys(a.hr_score ?? {}).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {HR_SCORE_FIELDS.map((sf) => a.hr_score?.[sf.key] && <span key={sf.key} className="chip bg-sand text-muted text-[11px]">{sf.label}: {a.hr_score[sf.key]}/5</span>)}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: actions */}
        <div className="space-y-5">
          {a.interview?.meet_url && (
            <Card className="border-mint/40">
              <h3 className="font-bold mb-2 flex items-center gap-2"><Icon name="CalendarClock" className="size-4 text-mint" /> นัดสัมภาษณ์</h3>
              <p className="text-sm">{a.interview.type} · {a.interview.date} {a.interview.start}</p>
              <a href={a.interview.meet_url} target="_blank" rel="noreferrer" className="btn-outline mt-2 inline-flex"><Icon name="Video" className="size-4" /> Google Meet</a>
            </Card>
          )}
          <ApplicationActions app={a} canEdit={canEdit} isOwner={ctx.isOwner} employees={employees} teams={teamOpts} />
          {canEdit && logs.length > 0 && (
            <Card>
              <h3 className="font-bold mb-3 text-sm">ประวัติการดำเนินการ</h3>
              <div className="space-y-2">
                {logs.map((l, i) => (
                  <div key={i} className="text-xs text-muted">
                    <span className="text-ink">{l.meta?.title || l.action}</span> · {l.actor_email || "ระบบ"} · {formatThaiDate(l.created_at)}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkChip({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip bg-sand text-ink hover:bg-brand-soft hover:text-gold text-xs">
      <Icon name={icon} className="size-3.5" /> {label}
    </a>
  );
}
function QA({ q, ans }: { q: string; ans: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{q}</p>
      <p className="text-sm text-muted mt-0.5 whitespace-pre-wrap">{ans}</p>
    </div>
  );
}
