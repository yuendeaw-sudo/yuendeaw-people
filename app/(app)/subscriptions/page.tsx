import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB, formatThaiDate } from "@/lib/utils";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "ใช้งานอยู่", tone: "mint" },
  trial: { label: "ทดลอง", tone: "amber" },
  cancelled: { label: "ยกเลิกแล้ว", tone: "sand" },
};

export default async function SubscriptionsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "subscriptions", "view") && !can(ctx, "finance", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "subscriptions", "edit");

  const [{ data: subs }, { data: emps }, { data: teams }] = await Promise.all([
    supabase.from("subscriptions").select("*, owner:owner_id(first_name, nickname), teams(name)").order("service_name"),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const teamOpts = teams ?? [];
  const list = subs ?? [];
  const active = list.filter((s) => s.status !== "cancelled");
  const monthly = active.reduce((sum, s) => {
    const c = Number(s.cost || 0);
    return sum + (s.billing_cycle === "yearly" ? c / 12 : c);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        icon="CreditCard"
        subtitle="ติดตาม SaaS และค่าใช้จ่ายเครื่องมือของบริษัท"
        action={canEdit ? <SubscriptionForm employees={employees} teams={teamOpts} /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="ค่าใช้จ่ายต่อเดือน" value={formatTHB(Math.round(monthly))} icon="Wallet" tone="brand" />
        <StatCard label="ต่อปี (ประมาณ)" value={formatTHB(Math.round(monthly * 12))} icon="CalendarRange" tone="grape" />
        <StatCard label="กำลังใช้งาน" value={active.length} icon="CircleCheck" tone="mint" />
        <StatCard label="ทั้งหมด" value={list.length} icon="CreditCard" tone="sand" />
      </div>

      {list.length ? (
        <Card>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-2 py-2 font-medium">บริการ</th>
                  <th className="px-2 py-2 font-medium">ค่าใช้จ่าย</th>
                  <th className="px-2 py-2 font-medium">ต่ออายุ</th>
                  <th className="px-2 py-2 font-medium">ผู้ดูแล</th>
                  <th className="px-2 py-2 font-medium">2FA</th>
                  <th className="px-2 py-2 font-medium">สถานะ</th>
                  {canEdit && <th className="px-2 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const st = STATUS[s.status] ?? { label: s.status, tone: "sand" };
                  const owner = (s as any).owner;
                  return (
                    <tr key={s.id} className="border-t border-sand/70">
                      <td className="px-2 py-3">
                        <div className="font-semibold">{s.service_name}</div>
                        {s.account_email && <div className="text-xs text-muted">{s.account_email}</div>}
                      </td>
                      <td className="px-2 py-3">
                        {s.cost ? formatTHB(Number(s.cost)) : "—"}
                        <span className="text-xs text-muted"> /{s.billing_cycle === "yearly" ? "ปี" : "เดือน"}</span>
                      </td>
                      <td className="px-2 py-3 text-muted">{s.renewal_date ? formatThaiDate(s.renewal_date) : "—"}</td>
                      <td className="px-2 py-3 text-muted">{owner?.nickname || owner?.first_name || "—"}</td>
                      <td className="px-2 py-3 text-muted">{s.twofa_status || "—"}</td>
                      <td className="px-2 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                      {canEdit && (
                        <td className="px-2 py-3 text-right">
                          <SubscriptionForm existing={s} employees={employees} teams={teamOpts} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon="CreditCard" title="ยังไม่มี subscription" subtitle="เพิ่ม SaaS/เครื่องมือที่บริษัทใช้เพื่อติดตามค่าใช้จ่าย" />
      )}
    </div>
  );
}
