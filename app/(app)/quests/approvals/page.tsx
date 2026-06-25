import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { QuestApproval } from "@/components/quests/QuestApproval";

const GROUPS: { keys: string[]; title: string; tone: string }[] = [
  { keys: ["submitted"], title: "รอตรวจ", tone: "grape" },
  { keys: ["submitted_for_review"], title: "รอตรวจผลงาน", tone: "grape" },
  { keys: ["awaiting_employee"], title: "รอพนักงานยืนยัน", tone: "amber" },
  { keys: ["needs_revision"], title: "ขอแก้ไข (อยู่ที่พนักงาน)", tone: "amber" },
  { keys: ["in_progress"], title: "กำลังทำ", tone: "brand" },
  { keys: ["completed"], title: "สำเร็จแล้ว", tone: "mint" },
  { keys: ["failed", "cancelled"], title: "ไม่สำเร็จ / ยกเลิก", tone: "sand" },
];

export default async function QuestApprovalsPage() {
  const ctx = (await getAccessContext())!;
  const canApprove = ctx.isOwner || can(ctx, "growth", "approve") || can(ctx, "growth", "view");
  if (!canApprove) redirect("/quests");
  const supabase = await createClient();

  const [{ data: quests }, { data: badges }] = await Promise.all([
    supabase
      .from("quests")
      .select("*, employees!quests_employee_id_fkey(first_name, nickname)")
      .order("updated_at", { ascending: false }),
    supabase.from("badges").select("name, tier").eq("is_active", true).order("sort_order"),
  ]);

  const list = quests ?? [];
  const pending = list.filter((q) => ["submitted", "submitted_for_review"].includes(q.status)).length;

  return (
    <div className="space-y-6">
      <Link href="/quests" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="ChevronLeft" className="size-4" /> Growth Quest
      </Link>
      <PageHeader
        title="อนุมัติภารกิจ"
        icon="ClipboardCheck"
        subtitle={`${pending} ภารกิจรอคุณตรวจ`}
      />

      {list.length === 0 && (
        <Card><p className="text-sm text-muted">ยังไม่มีภารกิจในระบบ</p></Card>
      )}

      {GROUPS.map((g) => {
        const items = list.filter((q) => g.keys.includes(q.status));
        if (!items.length) return null;
        return (
          <section key={g.title}>
            <h2 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
              {g.title} <Badge tone={g.tone}>{items.length}</Badge>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {items.map((q) => (
                <QuestApproval key={q.id} q={q} badges={badges ?? []} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
