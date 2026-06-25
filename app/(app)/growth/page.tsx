import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { REQUEST_STATUS } from "@/lib/phase2-labels";
import { LevelForm } from "@/components/growth/LevelForm";
import { PromotionForm } from "@/components/growth/PromotionForm";
import { PromotionActions } from "@/components/growth/PromotionActions";

export default async function GrowthPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "growth", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "growth", "edit") || can(ctx, "admin_settings", "edit");
  const canCreate = can(ctx, "growth", "create");
  const canApprove = can(ctx, "growth", "approve") || ctx.isOwner;

  const [{ data: tracks }, { data: levels }, { data: promos }, { data: emps }] = await Promise.all([
    supabase.from("career_tracks").select("id, name").order("sort_order"),
    supabase.from("career_levels").select("id, track_id, level_order, title, responsibility, required_skill, evidence_needed").order("level_order"),
    supabase
      .from("promotion_requests")
      .select(
        "id, status, manager_comment, effective_date, created_at, employees!promotion_requests_employee_id_fkey(first_name, nickname), career_levels!promotion_requests_to_level_id_fkey(title)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  const allLevels = levels ?? [];
  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const levelOpts = allLevels.map((l) => ({ id: l.id, name: l.title }));

  return (
    <div>
      <PageHeader
        title="Career & Growth"
        icon="TrendingUp"
        subtitle="เส้นทางการเติบโต และการเลื่อนตำแหน่ง"
        action={canCreate ? <PromotionForm employees={employees} levels={levelOpts} proposerId={ctx.employeeId} /> : undefined}
      />

      {/* Promotion requests */}
      <h2 className="text-sm font-semibold text-muted mb-3">คำขอเลื่อนตำแหน่ง</h2>
      {promos && promos.length ? (
        <Card className="mb-7">
          <div className="space-y-2">
            {promos.map((p) => {
              const st = REQUEST_STATUS[p.status] ?? { label: p.status, tone: "sand" };
              const emp = (p as any).employees;
              const lvl = (p as any).career_levels;
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
                  <Avatar name={emp?.nickname || emp?.first_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {emp?.nickname || emp?.first_name}
                      {lvl && <span className="text-muted font-normal"> → {lvl.title}</span>}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {formatThaiDate(p.created_at)}
                      {p.effective_date && ` · มีผล ${formatThaiDate(p.effective_date)}`}
                      {p.manager_comment && ` · ${p.manager_comment}`}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <PromotionActions id={p.id} status={p.status} canApprove={canApprove} />
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="mb-7">
          <p className="text-sm text-muted">ยังไม่มีคำขอเลื่อนตำแหน่ง</p>
        </Card>
      )}

      {/* Career tracks */}
      <h2 className="text-sm font-semibold text-muted mb-3">เส้นทางสายงาน (Career Tracks)</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {(tracks ?? []).map((t) => {
          const tLevels = allLevels.filter((l) => l.track_id === t.id);
          return (
            <Card key={t.id}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Icon name="Route" className="size-4 text-gold" /> {t.name}
              </h3>
              {tLevels.length ? (
                <ol className="space-y-2">
                  {tLevels.map((l, i) => (
                    <li key={l.id} className="flex gap-3">
                      <div className="grid place-items-center size-6 rounded-full bg-brand text-ink text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{l.title}</div>
                        {l.responsibility && <div className="text-xs text-muted">{l.responsibility}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted">ยังไม่มีระดับในสายนี้</p>
              )}
              {canEdit && <LevelForm trackId={t.id} nextOrder={tLevels.length + 1} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
