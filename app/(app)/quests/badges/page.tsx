import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { TIERS, questType } from "@/lib/quests";

export default async function BadgesPage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();

  const [{ data: earned }, { data: catalog }] = await Promise.all([
    ctx.employeeId
      ? supabase
          .from("employee_badges")
          .select("badge_name, tier, points, awarded_at, quests(title)")
          .eq("employee_id", ctx.employeeId)
          .order("awarded_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("badges").select("name, category, tier, description, icon").eq("is_active", true).order("sort_order"),
  ]);

  const myBadges = earned ?? [];

  // group catalog by category
  const cats = (catalog ?? []).reduce<Record<string, any[]>>((acc, b) => {
    (acc[b.category || "อื่น ๆ"] ||= []).push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Link href="/quests" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="ChevronLeft" className="size-4" /> Growth Quest
      </Link>
      <PageHeader title="คลัง Badge" icon="Award" subtitle={`${myBadges.length} badge ที่ปลดล็อกแล้ว`} />

      {/* earned */}
      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">Badge ของฉัน</h2>
        {myBadges.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {myBadges.map((b, i) => (
              <Card key={i} className="text-center">
                <div className="text-4xl">{TIERS[b.tier]?.emoji ?? "🏅"}</div>
                <div className="font-bold mt-2">{b.badge_name}</div>
                <div className="text-xs mt-0.5" style={{ color: TIERS[b.tier]?.color }}>{TIERS[b.tier]?.th ?? b.tier}</div>
                {(b as any).quests?.title && <div className="text-[11px] text-muted mt-1 truncate">{(b as any).quests.title}</div>}
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted mt-2">
                  <span>+{b.points} แต้ม</span>·<span>{formatThaiDate(b.awarded_at)}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon="Award" title="ยังไม่มี Badge" subtitle="ทำภารกิจให้สำเร็จเพื่อปลดล็อก Badge แรก 🏅" />
        )}
      </section>

      {/* catalog */}
      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">Badge ทั้งหมดที่สะสมได้</h2>
        <div className="space-y-5">
          {Object.entries(cats).map(([cat, items]) => {
            const t = questType(cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{t.emoji}</span>
                  <span className="text-sm font-semibold">{t.th}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((b, i) => (
                    <span key={i} className="chip border border-sand" style={{ color: TIERS[b.tier]?.color }}>
                      {TIERS[b.tier]?.emoji} {b.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
