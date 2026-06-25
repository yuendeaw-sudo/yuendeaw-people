import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatReward, formatThaiDate } from "@/lib/utils";
import { REWARD_TYPES, REQUEST_STATUS } from "@/lib/phase2-labels";
import { BonusForm } from "@/components/rewards/BonusForm";
import { BonusActions } from "@/components/rewards/BonusActions";

export default async function RewardsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "rewards", "view") && !ctx.isOwner) redirect("/dashboard");
  const supabase = await createClient();
  // ผู้ให้รางวัล/สวัสดิการ = เจ้าของเท่านั้น
  const canCreate = ctx.isOwner;
  const canApprove = ctx.isOwner;

  const [{ data: bonuses }, { data: emps }] = await Promise.all([
    supabase
      .from("bonus_requests")
      .select(
        "id, category, amount, unit, reason, status, payment_status, created_at, employees!bonus_requests_employee_id_fkey(first_name, nickname)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const list = bonuses ?? [];
  // รวมยอด "เงิน" ที่อนุมัติแล้วเท่านั้น (ไม่นับ % หรือ วัน)
  const totalApproved = list
    .filter((b) => (b.status === "approved" || b.status === "paid") && (b.unit ?? "baht") === "baht")
    .reduce((s, b) => s + Number(b.amount || 0), 0);

  const typeOf = (cat: string) => REWARD_TYPES.find((t) => t.v === cat);

  return (
    <div>
      <PageHeader
        title="รางวัล & สวัสดิการ"
        icon="Gift"
        subtitle={`อนุมัติแล้วรวม ${formatReward(totalApproved, "baht")}`}
        action={canCreate ? <BonusForm employees={employees} proposerId={ctx.employeeId} /> : undefined}
      />

      <Card className="mb-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Icon name="Sparkles" className="size-4 text-gold" /> แค็ตตาล็อกสวัสดิการ
        </h2>
        <div className="flex flex-wrap gap-2">
          {REWARD_TYPES.map((t) => (
            <span key={t.v} className="chip border border-sand">
              <Icon name={t.icon} className="size-3.5 text-gold" /> {t.label}
              {t.unit === "salary" && <span className="text-muted text-[11px]">(% / บาท)</span>}
              {t.unit === "days" && <span className="text-muted text-[11px]">(วัน)</span>}
            </span>
          ))}
        </div>
        {canCreate && (
          <p className="text-xs text-muted mt-3">เฉพาะเจ้าของเป็นผู้ให้รางวัล/สวัสดิการแก่พนักงาน</p>
        )}
      </Card>

      <h2 className="text-sm font-semibold text-muted mb-3">รายการรางวัล / สวัสดิการ</h2>
      {list.length ? (
        <Card>
          <div className="space-y-2">
            {list.map((b) => {
              const st = REQUEST_STATUS[b.status] ?? { label: b.status, tone: "sand" };
              const t = typeOf(b.category);
              const emp = (b as any).employees;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
                  <Avatar name={emp?.nickname || emp?.first_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {formatReward(Number(b.amount), b.unit)}
                      <span className="text-muted font-normal text-sm">· {t?.label ?? b.category}</span>
                      {String(b.reason ?? "").startsWith("Growth Quest:") && (
                        <span className="chip bg-brand-soft text-gold text-[10px]">🎯 จาก Quest</span>
                      )}
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
        <EmptyState icon="Gift" title="ยังไม่มีรายการ" subtitle="กดปุ่ม 'ให้รางวัล / สวัสดิการ' เพื่อเริ่ม" />
      )}
    </div>
  );
}
