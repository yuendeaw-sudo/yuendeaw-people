import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB } from "@/lib/utils";
import { RunNotificationsButton } from "@/components/notifications/RunNotificationsButton";

export default async function OwnerRoom() {
  const ctx = (await getAccessContext())!;
  if (!ctx.isOwner) redirect("/dashboard");
  const supabase = await createClient();

  async function count(table: string, build?: (q: any) => any) {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  }

  // employment-type cards count by type; ทดลองงาน counts by status
  const { data: ets } = await supabase
    .from("employment_types")
    .select("id, key")
    .in("key", ["full_time", "intern", "freelance"]);
  const idByKey: Record<string, string> = {};
  for (const t of ets ?? []) idByKey[t.key] = t.id;
  const countByType = (key: string) =>
    idByKey[key] ? count("employees", (q) => q.eq("employment_type_id", idByKey[key])) : Promise.resolve(0);

  const [active, interns, freelance, probation, pendingLeave, newApps, openIncidents, subsCount] =
    await Promise.all([
      countByType("full_time"),
      countByType("intern"),
      countByType("freelance"),
      count("employees", (q) => q.eq("status", "probation")),
      count("leave_requests", (q) => q.eq("status", "pending")),
      count("applications", (q) => q.eq("stage", "new")),
      count("incidents", (q) => q.neq("status", "closed")),
      count("subscriptions"),
    ]);

  // cost analytics
  const [{ data: subRows }, { data: bonusRows }] = await Promise.all([
    supabase.from("subscriptions").select("cost, billing_cycle, status"),
    supabase.from("bonus_requests").select("amount, status"),
  ]);
  const subMonthly = (subRows ?? [])
    .filter((s: any) => s.status !== "cancelled")
    .reduce((sum: number, s: any) => sum + (s.billing_cycle === "yearly" ? Number(s.cost || 0) / 12 : Number(s.cost || 0)), 0);
  const bonusApproved = (bonusRows ?? [])
    .filter((b: any) => ["approved", "paid"].includes(b.status))
    .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

  return (
    <div className="space-y-7">
      <div className="card p-6 bg-ink text-paper">
        <div className="flex items-center gap-3 flex-wrap">
          <Icon name="Crown" className="size-7 text-brand" />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">Owner Room</h1>
            <p className="text-paper/60 text-sm">ภาพรวมบริษัทแบบเรียลไทม์</p>
          </div>
          <RunNotificationsButton />
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">คนในองค์กร</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="พนักงานประจำ" value={active} icon="Users" tone="brand" />
          <StatCard label="เด็กฝึกงาน" value={interns} icon="GraduationCap" tone="grape" />
          <StatCard label="ทดลองงาน" value={probation} icon="Clock" tone="amber" />
          <StatCard label="ฟรีแลนซ์" value={freelance} icon="Briefcase" tone="sand" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">ต้องตัดสินใจ / ติดตาม</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="คำขอลารออนุมัติ" value={pendingLeave} icon="CalendarClock" tone="amber" />
          <StatCard label="ใบสมัครใหม่" value={newApps} icon="FileUser" tone="grape" />
          <StatCard label="เคสวินัยที่เปิดอยู่" value={openIncidents} icon="ShieldAlert" tone="rose" />
          <StatCard label="Subscriptions" value={subsCount} icon="CreditCard" tone="brand" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">ต้นทุน & การเงิน</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="ค่า Subscription/เดือน" value={formatTHB(Math.round(subMonthly))} icon="Wallet" tone="brand" />
          <StatCard label="ค่า Subscription/ปี" value={formatTHB(Math.round(subMonthly * 12))} icon="CalendarRange" tone="grape" />
          <StatCard label="โบนัสอนุมัติแล้ว" value={formatTHB(bonusApproved)} icon="Gift" tone="mint" />
        </div>
      </section>

      <Card>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Icon name="Sparkles" className="size-4 text-gold" /> กำลังจะมาในเฟสถัดไป
        </h2>
        <p className="text-sm text-muted">
          Performance overview · Top performers · Risk signals · Promotion candidates · Payroll estimate ·
          Welfare cost · AI workplace usage · Company knowledge updates
        </p>
      </Card>
    </div>
  );
}
