import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB, formatThaiDate } from "@/lib/utils";
import { BONUS_CATEGORIES, REQUEST_STATUS } from "@/lib/phase2-labels";
import { BonusForm } from "@/components/rewards/BonusForm";
import { BonusActions } from "@/components/rewards/BonusActions";

export default async function RewardsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "rewards", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canCreate = can(ctx, "rewards", "create");
  const canApprove = can(ctx, "rewards", "approve");

  const [{ data: benefits }, { data: bonuses }, { data: emps }] = await Promise.all([
    supabase.from("benefits").select("id, name, category").eq("is_active", true),
    supabase
      .from("bonus_requests")
      .select(
        "id, category, amount, reason, status, payment_status, created_at, employees!bonus_requests_employee_id_fkey(first_name, nickname)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const list = bonuses ?? [];
  const totalApproved = list
    .filter((b) => b.status === "approved" || b.status === "paid")
    .reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="รางวัล & สวัสดิการ"
        icon="Gift"
        subtitle={`อนุมัติแล้วรวม ${formatTHB(totalApproved)}`}
        action={canCreate ? <BonusForm employees={employees} proposerId={ctx.employeeId} /> : undefined}
      />

      <Card className="mb-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Icon name="Sparkles" className="size-4 text-gold" /> แค็ตตาล็อกสวัสดิการ
        </h2>
        <div className="flex flex-wrap gap-2">
          {(benefits ?? []).map((b) => (
            <span key={b.id} className="chip border border-sand">
              <Icon name="Gift" className="size-3.5 text-gold" /> {b.name}
            </span>
          ))}
        </div>
      </Card>

      <h2 className="text-sm font-semibold text-muted mb-3">คำขอโบนัส / รางวัล</h2>
      {list.length ? (
        <Card>
          <div className="space-y-2">
            {list.map((b) => {
              const st = REQUEST_STATUS[b.status] ?? { label: b.status, tone: "sand" };
              const cat = BONUS_CATEGORIES.find((c) => c.v === b.category)?.label ?? b.category;
              const emp = (b as any).employees;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
                  <Avatar name={emp?.nickname || emp?.first_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {formatTHB(Number(b.amount))} <span className="text-muted font-normal text-sm">· {cat}</span>
                    </div>
                    <div className="text-xs text-muted truncate">
                      {emp?.nickname || emp?.first_name} · {formatThaiDate(b.created_at)}
                      {b.reason && ` · ${b.reason}`}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <BonusActions id={b.id} status={b.status} canApprove={canApprove} />
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <EmptyState icon="Gift" title="ยังไม่มีคำขอโบนัส" subtitle="กดปุ่ม 'เสนอโบนัส' เพื่อเริ่ม" />
      )}
    </div>
  );
}
