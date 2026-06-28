import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PromptLibrary } from "@/components/ai/PromptLibrary";

export default async function AIWorkplacePage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();

  const [{ data: agents }, { data: prompts }] = await Promise.all([
    supabase.from("ai_agents").select("id, key, name, description, access").eq("is_active", true).order("sort_order"),
    supabase.from("prompt_templates").select("id, title, category, body").order("created_at", { ascending: false }).limit(20),
  ]);

  const visible = (agents ?? []).filter((a: any) => {
    const ac = a.access ?? {};
    if (ctx.isOwner) return true;
    if (ac.owner_only) return false;
    return true; // role/employment filtering refined later
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="AI Workplace"
        icon="Sparkles"
        subtitle="ผู้ช่วย AI (Claude) + Prompt Library สำหรับทีม YuenDeaw"
        action={
          <a href="https://ai.yuendeaw.com" target="_blank" rel="noreferrer" className="btn-brand">
            <Icon name="Sparkles" className="size-4" /> เปิด ai.yuendeaw.com
            <Icon name="ExternalLink" className="size-3.5" />
          </a>
        }
      />

      <section>
        <h2 className="text-sm font-semibold text-muted mb-3">AI Agents</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((a: any) => (
            <a
              key={a.id}
              href={`https://ai.yuendeaw.com/?agent=${encodeURIComponent(a.key)}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className="card p-4 hover:shadow-pop transition h-full">
                <div className="flex items-start justify-between">
                  <div className="grid place-items-center size-10 rounded-xl bg-grape-soft text-grape">
                    <Icon name="Bot" className="size-5" />
                  </div>
                  {a.access?.owner_only && <Badge tone="rose">เจ้าของ</Badge>}
                </div>
                <div className="font-semibold mt-3">{a.name}</div>
                <div className="text-xs text-muted mt-0.5">{a.description}</div>
                <div className="flex items-center gap-1 text-xs font-semibold text-gold mt-3">
                  เริ่มแชท <Icon name="ExternalLink" className="size-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <Card>
        <PromptLibrary
          prompts={prompts ?? []}
          employeeId={ctx.employeeId}
          canCreate={can(ctx, "ai_workplace", "view")}
        />
      </Card>
    </div>
  );
}
