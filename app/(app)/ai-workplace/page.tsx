import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentCatalog, type WorkplaceAgent } from "@/components/ai/AgentCatalog";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHeader } from "@/components/ui";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEGACY_AI_URL = "https://ai.yuendeaw.com";

function LegacyAIWorkplace() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="AI Workplace"
        icon="Sparkles"
        subtitle="AI Workspace เดิมของทีม YuenDeaw"
        action={
          <a href={LEGACY_AI_URL} target="_blank" rel="noreferrer" className="btn-brand">
            <Icon name="ExternalLink" className="size-4" /> เปิดเต็มหน้าจอ
          </a>
        }
      />
      <div className="card overflow-hidden p-0">
        <iframe
          src={LEGACY_AI_URL}
          title="ai.yuendeaw.com"
          className="h-[calc(100vh-10.5rem)] w-full border-0 bg-white"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
      </div>
    </div>
  );
}

/**
 * The built-in People OS AI agents use People OS Supabase and its existing
 * authenticated /api/ai/chat. Never duplicate the retired Workspace members.
 * AI_WORKPLACE_LEGACY_IFRAME=true is a temporary rollback option before pause.
 */
export default async function AIWorkplacePage() {
  const ctx = await getAccessContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner && !ctx.employeeId) redirect("/pending");
  if (!can(ctx, "ai_workplace", "view")) redirect("/dashboard");

  if (process.env.AI_WORKPLACE_LEGACY_IFRAME === "true") {
    return <LegacyAIWorkplace />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select("key,name,description,access")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[people/ai-workplace] Failed to load catalog", { code: error.code });
  }

  // Only presentation metadata crosses the server -> client boundary.
  // Full system prompts and owner-only agent metadata are never returned here.
  const agents: WorkplaceAgent[] = (data ?? [])
    .filter((agent) => {
      const access = agent.access;
      const ownerOnly =
        access !== null &&
        typeof access === "object" &&
        !Array.isArray(access) &&
        access.owner_only === true;
      return ctx.isOwner || !ownerOnly;
    })
    .map((agent) => {
      const access = agent.access;
      return {
        key: agent.key,
        name: agent.name,
        description: agent.description,
        ownerOnly: Boolean(
          access !== null &&
            typeof access === "object" &&
            !Array.isArray(access) &&
            access.owner_only === true,
        ),
      };
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Workplace"
        icon="Sparkles"
        subtitle="เลือกผู้ช่วยสำหรับงานของคุณ — ใช้บัญชี YuenDeaw People เดียวกัน"
        action={
          <Link href="/knowledge" className="btn-outline">
            <Icon name="Library" className="size-4" /> Knowledge Base
          </Link>
        }
      />
      <div className="flex items-start gap-3 rounded-xl2 border border-brand/30 bg-brand-soft/60 p-4">
        <Icon name="Sparkles" className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-ink">
          เลือก AI Assistant ได้เลย ไม่ต้องเข้าสู่ระบบ AI Workspace อีกบัญชี
          <span className="mt-1 block text-xs text-muted">
            ระบบนี้ใช้ AI Agents และสิทธิ์พนักงานของ YuenDeaw People โดยตรง
          </span>
        </p>
      </div>

      {error ? (
        <EmptyState
          icon="WifiOff"
          title="ไม่สามารถโหลด AI Assistants ได้"
          subtitle="กรุณาลองใหม่อีกครั้ง หากยังไม่สำเร็จให้แจ้งผู้ดูแลระบบ"
        />
      ) : agents.length === 0 ? (
        <EmptyState
          icon="Bot"
          title="ยังไม่มี AI Assistant ที่ใช้ได้"
          subtitle="ติดต่อผู้ดูแลระบบเพื่อตรวจสิทธิ์และการเปิดใช้งาน AI"
        />
      ) : (
        <AgentCatalog agents={agents} />
      )}
    </div>
  );
}
