import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge, EmptyState, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { LeaveBalances } from "@/components/leave/LeaveBalances";
import { LeavePolicyGuide } from "@/components/leave/LeavePolicyGuide";

export default async function DashboardPage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  const isHR = can(ctx, "people", "view");
  const isLeaveMgr = can(ctx, "time_leave", "view") || can(ctx, "time_leave", "approve");

  const hour = new Date().getHours();
  const greet = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  // ---- personal data ----
  let myBalances: any[] = [];
  let myRequests: any[] = [];
  let empTypeKey = "full_time";
  let empStart: string | null = null;
  if (ctx.employeeId) {
    const year = new Date().getFullYear();
    const { data: emp } = await supabase
      .from("employees")
      .select("start_date, employment_types(key)")
      .eq("id", ctx.employeeId)
      .maybeSingle();
    empTypeKey = (emp as any)?.employment_types?.key ?? "full_time";
    empStart = (emp as any)?.start_date ?? null;
    const [{ data: bal }, { data: req }] = await Promise.all([
      supabase
        .from("leave_balances")
        .select("entitled_days, used_days, leave_types(name, color)")
        .eq("employee_id", ctx.employeeId)
        .eq("year", year),
      supabase
        .from("leave_requests")
        .select("id, start_date, end_date, status, leave_types(name)")
        .eq("employee_id", ctx.employeeId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    myBalances = bal ?? [];
    myRequests = req ?? [];
  }

  // ---- HR / owner aggregates ----
  const counts = { active: 0, intern: 0, probation: 0, freelance: 0 };
  let pendingLeave = 0;
  let newApps = 0;
  if (isHR) {
    // employment-type cards count by type; ทดลองงาน counts by status
    const { data: ets } = await supabase
      .from("employment_types")
      .select("id, key")
      .in("key", ["full_time", "intern", "freelance"]);
    const idByKey: Record<string, string> = {};
    for (const t of ets ?? []) idByKey[t.key] = t.id;

    const countByType = async (key: string) => {
      if (!idByKey[key]) return 0;
      const { count } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("employment_type_id", idByKey[key]);
      return count ?? 0;
    };

    const [ft, it, fl, pb, na] = await Promise.all([
      countByType("full_time"),
      countByType("intern"),
      countByType("freelance"),
      supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "probation"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "new"),
    ]);
    counts.active = ft;
    counts.intern = it;
    counts.freelance = fl;
    counts.probation = pb.count ?? 0;
    newApps = na.count ?? 0;
  }
  if (isLeaveMgr) {
    const { count } = await supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingLeave = count ?? 0;
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greet} 👋
        </h1>
        <p className="text-muted text-sm mt-1">ภาพรวมของวันนี้</p>
      </div>

      {/* HR / Owner overview */}
      {isHR && (
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">ภาพรวมทีม</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="พนักงานประจำ" value={counts.active} icon="Users" tone="brand" />
            <StatCard label="เด็กฝึกงาน" value={counts.intern} icon="GraduationCap" tone="grape" />
            <StatCard label="ทดลองงาน" value={counts.probation} icon="Clock" tone="amber" />
            <StatCard label="ฟรีแลนซ์" value={counts.freelance} icon="Briefcase" tone="sand" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Link href="/time-leave">
              <div className="card p-4 hover:shadow-pop transition flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center size-10 rounded-xl bg-amber-soft text-[#9a6b06]">
                    <Icon name="CalendarClock" className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{pendingLeave} คำขอลา</div>
                    <div className="text-xs text-muted">รออนุมัติ</div>
                  </div>
                </div>
                <Icon name="ChevronRight" className="size-5 text-muted" />
              </div>
            </Link>
            {can(ctx, "applications", "view") && (
              <Link href="/applications">
                <div className="card p-4 hover:shadow-pop transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center size-10 rounded-xl bg-grape-soft text-grape">
                      <Icon name="FileUser" className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{newApps} ใบสมัครใหม่</div>
                      <div className="text-xs text-muted">รอคัดกรอง</div>
                    </div>
                  </div>
                  <Icon name="ChevronRight" className="size-5 text-muted" />
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Personal */}
      <section className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">วันลาคงเหลือ</h2>
            <Link href="/time-leave" className="text-xs font-semibold text-gold hover:underline">
              จัดการ →
            </Link>
          </div>
          {myBalances.length ? (
            <div className="space-y-3">
              {myBalances.map((b, i) => {
                const remain = Number(b.entitled_days) - Number(b.used_days);
                const pct = b.entitled_days ? (Number(b.used_days) / Number(b.entitled_days)) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{b.leave_types?.name}</span>
                      <span className="text-muted">
                        เหลือ <b className="text-ink">{remain}</b> / {b.entitled_days} วัน
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-sand overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">ยังไม่มีข้อมูลวันลาในปีนี้</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">คำขอล่าสุดของฉัน</h2>
            <Link href="/time-leave" className="text-xs font-semibold text-gold hover:underline">
              ขอลา →
            </Link>
          </div>
          {myRequests.length ? (
            <div className="space-y-2">
              {myRequests.map((r) => {
                const sb = statusBadge(r.status);
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-sand/40 px-3 py-2.5">
                    <div className="text-sm">
                      <div className="font-medium">{r.leave_types?.name}</div>
                      <div className="text-xs text-muted">
                        {formatThaiDate(r.start_date)} – {formatThaiDate(r.end_date)}
                      </div>
                    </div>
                    <Badge tone={sb.tone}>{sb.label}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="CalendarPlus" title="ยังไม่มีคำขอ" subtitle="กดปุ่ม 'ขอลา' เพื่อเริ่มต้น" />
          )}
        </Card>
      </section>

      {/* Leave balances + rules */}
      {ctx.employeeId && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted">วันลาคงเหลือของฉัน</h2>
          <LeaveBalances employeeId={ctx.employeeId} startDate={empStart} employmentTypeKey={empTypeKey} />
          <LeavePolicyGuide />
        </section>
      )}

      {ctx.isOwner && (
        <Link href="/owner">
          <div className="card p-5 bg-ink text-paper hover:shadow-pop transition flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="Crown" className="size-6 text-brand" />
              <div>
                <div className="font-bold">Owner Room</div>
                <div className="text-sm text-paper/60">ภาพรวมบริษัทแบบเรียลไทม์สำหรับเจ้าของ</div>
              </div>
            </div>
            <Icon name="ArrowRight" className="size-5" />
          </div>
        </Link>
      )}
    </div>
  );
}
