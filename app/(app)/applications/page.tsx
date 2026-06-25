import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { StageSelect } from "@/components/applications/StageSelect";
import { ConvertButton } from "@/components/applications/ConvertButton";

const STAGE_LABEL: Record<string, { label: string; tone: string }> = {
  new: { label: "ใหม่", tone: "grape" },
  reviewing: { label: "กำลังพิจารณา", tone: "amber" },
  shortlisted: { label: "Shortlist", tone: "brand" },
  interview: { label: "สัมภาษณ์", tone: "brand" },
  accepted: { label: "รับ", tone: "mint" },
  rejected: { label: "ปฏิเสธ", tone: "rose" },
  talent_pool: { label: "Talent Pool", tone: "sand" },
  converted_intern: { label: "แปลงเป็นฝึกงาน", tone: "mint" },
  converted_employee: { label: "แปลงเป็นพนักงาน", tone: "mint" },
};

export default async function ApplicationsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "applications", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "applications", "edit");
  const canConvert = canEdit && can(ctx, "people", "create");

  const { data: apps } = await supabase
    .from("applications")
    .select("id, full_name, nickname, kind, position, field_interest, email, stage, created_at, portfolio_url, converted_employee_id")
    .order("created_at", { ascending: false });

  const list = apps ?? [];
  const newCount = list.filter((a) => a.stage === "new").length;

  return (
    <div>
      <PageHeader
        title="ใบสมัคร"
        icon="FileUser"
        subtitle={`${list.length} ใบสมัคร · ${newCount} ใหม่`}
        action={
          <div className="flex gap-2">
            <a href="/apply/job" target="_blank" className="btn-outline">
              <Icon name="ExternalLink" className="size-4" /> ฟอร์มสมัครงาน
            </a>
            <a href="/apply/internship" target="_blank" className="btn-ghost">
              <Icon name="ExternalLink" className="size-4" /> ฟอร์มฝึกงาน
            </a>
          </div>
        }
      />

      {list.length ? (
        <Card>
          <div className="space-y-2">
            {list.map((a) => {
              const st = STAGE_LABEL[a.stage] ?? { label: a.stage, tone: "sand" };
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
                  <Avatar name={a.nickname || a.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {a.full_name} {a.nickname && <span className="text-muted">({a.nickname})</span>}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {a.kind === "internship" ? "ฝึกงาน" : "สมัครงาน"}
                      {a.position && ` · ${a.position}`}
                      {a.field_interest && ` · ${a.field_interest}`} · {formatThaiDate(a.created_at)}
                    </div>
                  </div>
                  {a.portfolio_url && (
                    <a href={a.portfolio_url} target="_blank" className="text-muted hover:text-gold" title="Portfolio">
                      <Icon name="Link" className="size-4" />
                    </a>
                  )}
                  {canEdit ? (
                    <StageSelect id={a.id} stage={a.stage} />
                  ) : (
                    <Badge tone={st.tone}>{st.label}</Badge>
                  )}
                  {canConvert && <ConvertButton app={a} />}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="FileUser"
          title="ยังไม่มีใบสมัคร"
          subtitle="แชร์ลิงก์ฟอร์มสมัครงาน/ฝึกงานเพื่อเริ่มรับสมัคร"
        />
      )}
    </div>
  );
}
