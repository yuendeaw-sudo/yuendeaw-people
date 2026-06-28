import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, EmptyState, Avatar, Badge } from "@/components/ui";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { paidDays, evalDueFromStart, internEvalState, DEFAULT_STIPEND } from "@/lib/intern";
import { InternEvaluation } from "@/components/intern/InternEvaluation";

export default async function MyInternsPage() {
  const ctx = (await getAccessContext())!;
  if (!ctx.employeeId && !ctx.isOwner) redirect("/dashboard");

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const isPeopleEdit = can(ctx, "people", "edit");

  // interns under my care (owner sees all interns)
  let q = admin
    .from("employees")
    .select("id, first_name, nickname, start_date, manager_id, stipend_start_date, stipend_daily_rate, employment_types!inner(key)")
    .eq("employment_types.key", "intern")
    .order("first_name");
  if (!ctx.isOwner) q = q.eq("manager_id", ctx.employeeId);
  const { data: interns } = await q;
  const baseList = interns ?? [];
  const ids = baseList.map((i) => i.id);

  const logsByIntern: Record<string, { log_date: string; content: string }[]> = {};
  const evalsByIntern: Record<string, { evaluator_id: string | null; status: string }[]> = {};
  if (ids.length) {
    const [{ data: logs }, { data: evals }] = await Promise.all([
      admin.from("intern_logs").select("intern_id, log_date, content").in("intern_id", ids).order("log_date", { ascending: false }),
      admin.from("intern_evaluations").select("intern_id, evaluator_id, status").in("intern_id", ids),
    ]);
    for (const l of logs ?? []) (logsByIntern[l.intern_id] ??= []).push(l);
    for (const e of evals ?? []) (evalsByIntern[e.intern_id] ??= []).push({ evaluator_id: e.evaluator_id, status: e.status });
  }

  // คำนวณสถานะ + เรียง: ยังไม่ผ่านขึ้นก่อน, ผ่านสมบูรณ์ไปท้ายสุด
  const rows = baseList
    .map((it) => {
      const logs = logsByIntern[it.id] ?? [];
      const logDates = logs.map((l) => l.log_date);
      const rate = Number((it as any).stipend_daily_rate) || DEFAULT_STIPEND;
      const start = (it as any).stipend_start_date ?? null;
      const state = internEvalState({
        stipendStart: start,
        managerId: (it as any).manager_id ?? null,
        evals: evalsByIntern[it.id] ?? [],
        isOwner: ctx.isOwner,
        isPeopleEdit,
        myEmployeeId: ctx.employeeId,
      });
      return {
        it,
        logs,
        rate,
        monthDays: paidDays(logDates, start, monthStart),
        totalDays: paidDays(logDates, start),
        due: evalDueFromStart((it as any).start_date),
        state,
      };
    })
    .sort((a, b) => Number(a.state.finallyPassed) - Number(b.state.finallyPassed));

  return (
    <div>
      <PageHeader title="น้องฝึกในความดูแล" icon="GraduationCap" subtitle="ดูบันทึกประจำวัน & ประเมินน้องฝึกที่คุณเป็นพี่เลี้ยง" />

      {rows.length ? (
        <div className="space-y-5">
          {rows.map(({ it, logs, rate, monthDays, totalDays, due, state }) => (
            <Card key={it.id} className={state.finallyPassed ? "opacity-80" : ""}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Avatar name={it.nickname || it.first_name} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center gap-2">
                    {it.first_name} {it.nickname && <span className="text-muted font-medium">({it.nickname})</span>}
                    {state.stage === "passed" && <Badge tone="mint">ผ่านแล้ว</Badge>}
                    {state.stage === "mentor_passed" && <Badge tone="amber">รอเจ้าของอนุมัติ</Badge>}
                  </div>
                  <div className="text-xs">
                    {state.stage === "passed" ? (
                      <span className="text-mint">
                        เบี้ยเดือนนี้ {monthDays} วัน · {formatTHB(monthDays * rate)} (รวม {totalDays} วัน)
                      </span>
                    ) : state.stage === "mentor_passed" ? (
                      <span className="text-amber-700">พี่เลี้ยงประเมินผ่านแล้ว · รอเจ้าของอนุมัติเพื่อเริ่มเบี้ย</span>
                    ) : state.stage === "failed" ? (
                      <span className="text-rose">ไม่ผ่านการประเมิน</span>
                    ) : (
                      <span className="text-gold">รอพี่เลี้ยงประเมิน{due && ` · กำหนด ${formatThaiDate(due)}`}</span>
                    )}
                  </div>
                </div>
              </div>

              {state.canEvaluate ? (
                <InternEvaluation employeeId={it.id} defaultStipendStart={due} label={state.evalLabel} />
              ) : !state.finallyPassed && ctx.isOwner && !state.mentorPassed ? (
                <p className="text-xs text-muted rounded-xl bg-sand/40 px-3 py-2">
                  ⏳ รอพี่เลี้ยง ({"หัวหน้างาน"}) ประเมินก่อน จึงจะอนุมัติได้
                </p>
              ) : null}

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
          ))}
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
