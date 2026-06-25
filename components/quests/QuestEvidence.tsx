import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { TIERS } from "@/lib/quests";

/**
 * Compact "Growth Quest evidence" strip for an employee — surfaces badges,
 * performance points, and completed quests where promotion/performance
 * decisions are made (employee file, promotion review).
 */
export async function QuestEvidence({ employeeId }: { employeeId: string }) {
  const supabase = await createClient();
  const [{ data: badges }, { data: quests }] = await Promise.all([
    supabase.from("employee_badges").select("badge_name, tier, points").eq("employee_id", employeeId).order("awarded_at", { ascending: false }),
    supabase.from("quests").select("status").eq("employee_id", employeeId),
  ]);

  const list = badges ?? [];
  const points = list.reduce((s, b) => s + Number(b.points || 0), 0);
  const completed = (quests ?? []).filter((q) => q.status === "completed").length;

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Target" className="size-4 text-gold" />
        <h3 className="font-semibold text-sm">หลักฐานจาก Growth Quest</h3>
        <span className="text-xs text-muted ml-auto">ใช้ประกอบการเลื่อนตำแหน่ง/ประเมินผล</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold">{list.length}</span>
          <span className="text-sm text-muted">Badge</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold">{points}</span>
          <span className="text-sm text-muted">Performance Points</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold">{completed}</span>
          <span className="text-sm text-muted">ภารกิจสำเร็จ</span>
        </div>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {list.slice(0, 8).map((b, i) => (
            <span key={i} className="chip border border-sand" style={{ color: TIERS[b.tier]?.color }}>
              {TIERS[b.tier]?.emoji} {b.badge_name}
            </span>
          ))}
          {list.length > 8 && <span className="text-xs text-muted self-center">+{list.length - 8}</span>}
        </div>
      )}
    </div>
  );
}
