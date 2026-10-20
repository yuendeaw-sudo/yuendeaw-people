import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Agent = {
  key: string;
  name: string;
  description: string | null;
  access: unknown;
  sort_order: number | null;
};

function canSeeAgent(agent: Agent, isOwner: boolean): boolean {
  if (!agent.access || typeof agent.access !== "object" || Array.isArray(agent.access)) {
    return true;
  }
  const rules = agent.access as Record<string, unknown>;
  return rules.owner_only !== true || isOwner;
}

/**
 * Native People OS AI launcher.
 *
 * The previous iframe at ai.yuendeaw.com depended on a separate, idle
 * Supabase project. This page reads the already-provisioned ai_agents table
 * from People OS and keeps the agent-level owner gate in place.
 */
export default async function AIWorkplacePage() {
  const ctx = await getAccessContext();
  if (!ctx) {
    return <EmptyState icon="Bot" title="กรุณาเข้าสู่ระบบก่อนใช้งาน AI Workplace" />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select("key,name,description,access,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const agents = ((data ?? []) as Agent[]).filter((agent) =>
    canSeeAgent(agent, ctx.isOwner),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Workplace"
        icon="Sparkles"
        subtitle="ผู้ช่วย AI ของทีม YuenDeaw — ใช้งานผ่านบัญชี People OS เดิม"
      />

      {error ? (
        <EmptyState icon="Bot" title="โหลดผู้ช่วย AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" />
      ) : agents.length === 0 ? (
        <EmptyState icon="Bot" title="ยังไม่มี AI Agent ที่เปิดให้ใช้งาน" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.key}
              href={`/ai-workplace/${encodeURIComponent(agent.key)}`}
              className="card flex min-h-32 items-start gap-3 p-4 transition hover:border-grape/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grape"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl2 bg-grape-soft text-grape">
                <Icon name="Bot" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block break-words text-base font-bold text-ink">{agent.name}</strong>
                <span className="mt-1 block break-words text-sm leading-relaxed text-muted">
                  {agent.description || "เริ่มสนทนากับผู้ช่วย AI"}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-grape">
                  เปิดสนทนา <Icon name="ChevronRight" className="size-3.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        ข้อมูล AI Agents และสิทธิ์การเข้าถึงดึงจาก People OS โดยตรง ไม่ต้องเปิดเว็บไซต์ AI Workspace แยก
      </p>
    </div>
  );
}
