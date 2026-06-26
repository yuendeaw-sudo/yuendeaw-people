import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, EmptyState, Avatar } from "@/components/ui";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { paidDays, evalDueFromStart, DEFAULT_STIPEND } from "@/lib/intern";
import { InternEvaluation } from "@/components/intern/InternEvaluation";

// พี่เลี้ยง (พนักงานทั่วไป) ดูบันทึก + ประเมินน้องฝึกของตัวเอง โดยไม่ต้องมีสิทธิ์ people
export default async function MyInternsPage() {
  const ctx = (await getAccessContext())!;
  if (!ctx.employeeId && !ctx.isOwner) redirect("/dashboard");

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  // interns under my care (owner sees all interns)
  let q = admin
    .from("employees")
    .select("id, first_name, nickname, start_date, stipend_start_date, stipend_daily_rate, employment_types!inner(key)")
    .eq("employment_types.key", "intern")
    .order("first_name");
  if (!ctx.isOwner) q = q.eq("manager_id", ctx.employeeId);
  const { data: interns } = await q;
  const list = interns ?? [];
  const ids = list.map((i) => i.id);

  const logsByIntern: Record<string, { log_date: string; content: string }[]> = {};
  const evalByIntern: Record<string, string> = {};
  if (ids.length) {
    const [{ data: logs }, { data: evals }] = await Promise.all([
      admin.from("intern_logs").select("intern_id, log_date, content").in("intern_id", ids).order("log_date", { ascending: false }),
      admin.from("intern_evaluations").select("intern_id, status, created_at").in("intern_id", ids).order("created_at", { ascending: false }),
    ]);
    for (const l of logs ?? []) (logsByIntern[l.intern_id] ??= []).push(l);
    for (const e of evals ?? []) if (!(e.intern_id in evalByIntern)) evalByIntern[e.intern_id] = e.status;
  }

  return (
    <div>
      <PageHeader title="น้องฝึกในความดูแล" icon="GraduationCap" subtitle="ดูบันทึกประจำวัน & ประเมินน้องฝึกที่คุณเป็นพี่เลี้ยง" />

      {list.length ? (
        <div className="space-y-5">
          {list.map((it) => {
            const logs = logsByIntern[it.id] ?? [];
            const logDates = logs.map((l) => l.log_date);
            const rate = Number((it as any).stipend_daily_rate) || DEFAULT_STIPEND;
            const start = (it as any).stipend_start_date ?? null;
            const monthDays = paidDays(logDates, start, monthStart);
            const totalDays = paidDays(logDates, start);
            const status = evalByIntern[it.id] ?? null;
            const due = evalDueFromStart((it as any).start_date);
            return (
              <Card key={it.id}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Avatar name={it.nickname || it.first_name} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">
                      {it.first_name} {it.nickname && <span className="text-muted font-medium">({it.nickname})</span>}
                    </div>
                    <div className="text-xs">
                      {status === "passed" ? (
                        <span className="text-mint">
                          ผ่านประเมินแล้ว · เบี้ยเดือนนี้ {monthDays} วัน · {formatTHB(monthDays * rate)} (รวม {totalDays} วัน)
                        </span>
                      ) : status === "failed" ? (
                        <span className="text-rose">ไม่ผ่านการประเมิน</span>
                      ) : (
                        <span className="text-gold">รอประเมิน{due && ` · กำหนด ${formatThaiDate(due)}`}</span>
                      )}
                    </div>
                  </div>
                </div>

                <InternEvaluation employeeId={it.id} />

                <h4 className="text-sm font-semibold text-muted mt-5 mb-2">บันทึกประจำวัน ({logs.length})</h4>
                {logs.length ? (
                  <div className="space-y-2 max-h-96 overflow-auto pr-1">
                    {logs.slice(0, 20).map((l) => (
                      <div key={l.log_date} className="rounded-xl bg-sand/40 px-3 py-2">
                        <div className="text-xs font-medium text-gold">{formatThaiDate(l.log_date)}</div>
                        <div className="text-sm whitespace-pre-wrap">{l.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">ยังไม่มีบันทึกประจำวัน</p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="GraduationCap"
          title="ยังไม่มีน้องฝึกในความดูแล"
          subtitle="เมื่อมีน้องฝึกที่ตั้งคุณเป็นหัวหน้างาน รายชื่อจะแสดงที่นี่"
        />
      )}
    </div>
  );
}
