import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB, formatThaiDate } from "@/lib/utils";
import { toTHB } from "@/lib/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "ใช้งานอยู่", tone: "mint" },
  trial: { label: "ทดลอง", tone: "amber" },
  cancelled: { label: "ยกเลิกแล้ว", tone: "sand" },
};

function costLabel(cost: number | null, currency: string | null, cycle: string) {
  if (!cost) return "—";
  const unit = currency === "USD" ? `$${Number(cost).toLocaleString()}` : formatTHB(Number(cost));
  return `${unit} /${cycle === "yearly" ? "ปี" : "เดือน"}`;
}

export default async function SubscriptionsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "subscriptions", "view") && !can(ctx, "finance", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "subscriptions", "edit");

  const [{ data: subs }, { data: emps }, { data: teams }, { data: accts }, { data: pms }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, owner:owner_id(first_name, nickname), teams(name), subscription_accounts(label, email)")
      .order("service_name"),
    supabase.from("employees").select("id, first_name, nickname, status, employment_types(key)").order("first_name"),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("subscription_accounts").select("id, label, email").order("label"),
    supabase.from("payment_methods").select("id, label, last4").order("label"),
  ]);

  // ผู้ดูแล: เฉพาะพนักงานประจำ (ตัดเด็กฝึก/ฟรีแลนซ์/ศิษย์เก่าออก)
  const employees = (emps ?? [])
    .filter((e: any) => e.employment_types?.key === "full_time" && !["alumni", "inactive"].includes(e.status))
    .map((e: any) => ({ id: e.id, name: e.nickname || e.first_name }));
  const teamOpts = teams ?? [];
  const accounts = (accts ?? []).map((a: any) => ({ id: a.id, label: a.label, email: a.email }));
  const paymentMethods = (pms ?? []).map((p: any) => ({ id: p.id, label: p.label, last4: p.last4 }));
  const pmMap = new Map(paymentMethods.map((p) => [p.id, p]));

  const list = subs ?? [];
  const active = list.filter((s) => s.status !== "cancelled");
  const monthly = active.reduce((sum, s) => {
    const thb = toTHB(Number(s.cost || 0), s.currency);
    return sum + (s.billing_cycle === "yearly" ? thb / 12 : thb);
  }, 0);

  // จัดกลุ่มตามบัญชีล็อกอิน (GSuite) — บัญชีเป็นหมวดหลัก
  const groups: { key: string; label: string; email: string | null; items: any[] }[] = [];
  const byId = new Map<string, (typeof groups)[number]>();
  for (const a of accounts) {
    const g = { key: a.id, label: a.label, email: a.email, items: [] as any[] };
    byId.set(a.id, g);
  }
  const ungrouped: any[] = [];
  for (const s of list) {
    if (s.account_id && byId.has(s.account_id)) byId.get(s.account_id)!.items.push(s);
    else ungrouped.push(s);
  }
  for (const a of accounts) {
    const g = byId.get(a.id)!;
    if (g.items.length) groups.push(g);
  }
  if (ungrouped.length) groups.push({ key: "none", label: "ไม่ได้ผูกบัญชีล็อกอิน", email: null, items: ungrouped });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        icon="CreditCard"
        subtitle="ติดตาม SaaS และค่าใช้จ่ายเครื่องมือของบริษัท"
        action={
          canEdit ? (
            <SubscriptionForm employees={employees} teams={teamOpts} accounts={accounts} paymentMethods={paymentMethods} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="ค่าใช้จ่ายต่อเดือน" value={formatTHB(Math.round(monthly))} icon="Wallet" tone="brand" />
        <StatCard label="ต่อปี (ประมาณ)" value={formatTHB(Math.round(monthly * 12))} icon="CalendarRange" tone="grape" />
        <StatCard label="กำลังใช้งาน" value={active.length} icon="CircleCheck" tone="mint" />
        <StatCard label="ทั้งหมด" value={list.length} icon="CreditCard" tone="sand" />
      </div>

      {list.length ? (
        <div className="space-y-5">
          {groups.map((g) => {
            const gMonthly = g.items
              .filter((s) => s.status !== "cancelled")
              .reduce((sum, s) => {
                const thb = toTHB(Number(s.cost || 0), s.currency);
                return sum + (s.billing_cycle === "yearly" ? thb / 12 : thb);
              }, 0);
            return (
              <Card key={g.key}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    <Icon name="KeyRound" className="size-4 text-gold" />
                    {g.label}
                    {g.email && g.email !== g.label && <span className="text-xs font-normal text-muted">{g.email}</span>}
                    <span className="text-xs font-normal text-muted">({g.items.length})</span>
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">~{formatTHB(Math.round(gMonthly))}/เดือน</span>
                    {canEdit && g.key !== "none" && (
                      <SubscriptionForm
                        employees={employees}
                        teams={teamOpts}
                        accounts={accounts}
                        paymentMethods={paymentMethods}
                        defaultAccountId={g.key}
                      />
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="px-2 py-2 font-medium">บริการ</th>
                        <th className="px-2 py-2 font-medium">ค่าใช้จ่าย</th>
                        <th className="px-2 py-2 font-medium">ต่ออายุ</th>
                        <th className="px-2 py-2 font-medium">ผู้ดูแล</th>
                        <th className="px-2 py-2 font-medium">จ่ายโดย</th>
                        <th className="px-2 py-2 font-medium">สถานะ</th>
                        {canEdit && <th className="px-2 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((s) => {
                        const st = STATUS[s.status] ?? { label: s.status, tone: "sand" };
                        const owner = (s as any).owner;
                        const pm = s.payment_method_id ? pmMap.get(s.payment_method_id) : null;
                        return (
                          <tr key={s.id} className="border-t border-sand/70">
                            <td className="px-2 py-3">
                              <div className="font-semibold">{s.service_name}</div>
                              {s.twofa_status && <div className="text-[11px] text-muted">2FA: {s.twofa_status}</div>}
                            </td>
                            <td className="px-2 py-3">
                              {costLabel(s.cost, s.currency, s.billing_cycle)}
                              {s.currency === "USD" && s.cost && (
                                <div className="text-[11px] text-muted">≈ {formatTHB(Math.round(toTHB(Number(s.cost), "USD")))}</div>
                              )}
                            </td>
                            <td className="px-2 py-3 text-muted">{s.renewal_date ? formatThaiDate(s.renewal_date) : "—"}</td>
                            <td className="px-2 py-3 text-muted">{owner?.nickname || owner?.first_name || "—"}</td>
                            <td className="px-2 py-3 text-muted">
                              {pm ? `${pm.label}${pm.last4 ? ` ····${pm.last4}` : ""}` : "—"}
                            </td>
                            <td className="px-2 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                            {canEdit && (
                              <td className="px-2 py-3 text-right">
                                <SubscriptionForm existing={s} employees={employees} teams={teamOpts} accounts={accounts} paymentMethods={paymentMethods} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="CreditCard" title="ยังไม่มี subscription" subtitle="เพิ่ม SaaS/เครื่องมือที่บริษัทใช้เพื่อติดตามค่าใช้จ่าย" />
      )}
    </div>
  );
}
