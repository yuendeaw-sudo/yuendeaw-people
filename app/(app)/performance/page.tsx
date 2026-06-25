import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { REVIEW_CYCLES } from "@/lib/phase2-labels";
import { TemplateForm } from "@/components/performance/TemplateForm";
import { ReviewForm } from "@/components/performance/ReviewForm";

export default async function PerformancePage() {
  const ctx = (await getAccessContext())!;
  if (!ctx.isOwner) redirect("/dashboard"); // Performance = เฉพาะเจ้าของ
  const supabase = await createClient();
  const canCreate = ctx.isOwner;

  const [{ data: templates }, { data: reviews }, { data: emps }] = await Promise.all([
    supabase.from("performance_templates").select("id, name, review_cycle, dimensions").eq("is_active", true).order("created_at"),
    supabase
      .from("performance_reviews")
      .select(
        "id, cycle, overall_score, summary, created_at, employees!performance_reviews_employee_id_fkey(first_name, nickname)"
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const tpls = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    review_cycle: t.review_cycle,
    dimensions: (t.dimensions as any) ?? [],
  }));
  const cycleLabel = (c?: string) => REVIEW_CYCLES.find((x) => x.v === c)?.label ?? c;

  return (
    <div>
      <PageHeader
        title="Performance"
        icon="Target"
        subtitle="ประเมินผลแบบอิงหลักฐาน (Evidence-based)"
        action={
          canCreate ? (
            <div className="flex gap-2">
              <TemplateForm />
              {tpls.length > 0 && <ReviewForm employees={employees} templates={tpls} reviewerId={ctx.employeeId} />}
            </div>
          ) : undefined
        }
      />

      <h2 className="text-sm font-semibold text-muted mb-3">KPI Templates</h2>
      {tpls.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
          {tpls.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div className="font-semibold">{t.name}</div>
                <Badge tone="grape">{cycleLabel(t.review_cycle)}</Badge>
              </div>
              <div className="text-xs text-muted mt-2">{t.dimensions.length} มิติ</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.dimensions.slice(0, 4).map((d: any) => (
                  <span key={d.key} className="chip bg-sand/60 text-muted text-[11px]">
                    {d.label.split(" — ")[0]}
                  </span>
                ))}
                {t.dimensions.length > 4 && <span className="text-[11px] text-muted">+{t.dimensions.length - 4}</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-7">
          <p className="text-sm text-muted">ยังไม่มี KPI template — กดปุ่ม "สร้าง KPI Template" เพื่อเริ่ม (มี 8 มิติมาตรฐานให้เลือก)</p>
        </Card>
      )}

      <h2 className="text-sm font-semibold text-muted mb-3">ผลประเมินล่าสุด</h2>
      {reviews && reviews.length ? (
        <Card>
          <div className="space-y-2">
            {reviews.map((r) => {
              const emp = (r as any).employees;
              const score = r.overall_score != null ? Number(r.overall_score) : null;
              const tone = score == null ? "sand" : score >= 4 ? "mint" : score >= 3 ? "brand" : "amber";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
                  <Avatar name={emp?.nickname || emp?.first_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{emp?.nickname || emp?.first_name}</div>
                    <div className="text-xs text-muted truncate">
                      {cycleLabel(r.cycle)} · {formatThaiDate(r.created_at)}
                      {r.summary && ` · ${r.summary}`}
                    </div>
                  </div>
                  {score != null && (
                    <Badge tone={tone}>
                      <Icon name="Star" className="size-3" /> {score.toFixed(1)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <EmptyState icon="Target" title="ยังไม่มีผลประเมิน" subtitle="สร้าง template แล้วกด 'ประเมินผลงาน'" />
      )}
    </div>
  );
}
