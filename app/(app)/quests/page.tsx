import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { QuestForm } from "@/components/quests/QuestForm";
import { QuestCard } from "@/components/quests/QuestCard";

export default async function QuestsPage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  const canApprove = ctx.isOwner || can(ctx, "growth", "approve") || can(ctx, "growth", "view");

  if (!ctx.employeeId) {
    return (
      <div>
        <PageHeader title="Growth Quest" icon="Target" subtitle="ภารกิจเติบโต" />
        <EmptyState icon="UserPlus" title="ยังไม่มีข้อมูลพนักงาน" subtitle="ผูกบัญชีกับข้อมูลพนักงานก่อนเริ่มตั้งภารกิจ" />
      </div>
    );
  }

  const [{ data: quests }, { data: myBadges }] = await Promise.all([
    supabase.from("quests").select("*").eq("employee_id", ctx.employeeId).order("created_at", { ascending: false }),
    supabase.from("employee_badges").select("points").eq("employee_id", ctx.employeeId),
  ]);

  const list = quests ?? [];
  const inProgress = list.filter((q) => q.status === "in_progress").length;
  const completed = list.filter((q) => q.status === "completed").length;
  const points = (myBadges ?? []).reduce((s, b) => s + Number(b.points || 0), 0);
  const badgeCount = (myBadges ?? []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Growth Quest · ภารกิจเติบโต"
        icon="Target"
        subtitle="ตั้งภารกิจของตัวเอง รับ Badge รางวัล และคะแนน Performance"
        action={
          <div className="flex gap-2">
            {canApprove && (
              <Link href="/quests/approvals" className="btn-ghost"><Icon name="ClipboardCheck" className="size-4" /> อนุมัติภารกิจ</Link>
            )}
            <QuestForm employeeId={ctx.employeeId} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Badge ที่มี" value={badgeCount} icon="Award" tone="amber" />
        <StatCard label="กำลังทำ" value={inProgress} icon="Loader" tone="brand" />
        <StatCard label="สำเร็จแล้ว" value={completed} icon="CircleCheck" tone="mint" />
        <StatCard label="Performance Points" value={points} icon="Sparkles" tone="grape" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">My Growth Quests</h2>
        <Link href="/quests/badges" className="text-xs font-semibold text-gold hover:underline">คลัง Badge →</Link>
      </div>

      {list.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((q) => (
            <QuestCard key={q.id} q={q} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="Target"
          title="ยังไม่มีภารกิจ"
          subtitle="ตั้งภารกิจแรกของคุณ แล้วเริ่มสะสม Badge กับคะแนน Performance 🚀"
        />
      )}
    </div>
  );
}
