import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AgentChat } from "@/components/ai/AgentChat";

const STARTERS: Record<string, string[]> = {
  hr_assistant: ["สรุปนโยบายการลาให้หน่อย", "ช่วยร่างประกาศรับสมัครงาน", "พนักงานทดลองงานใกล้ครบ ควรทำอะไรบ้าง"],
  handbook_assistant: ["บริษัทมีวันลากี่ประเภท", "นโยบายการใช้ AI เป็นยังไง", "Work from home ได้ไหม"],
  production_assistant: ["ช่วยทำเช็กลิสต์ก่อนถ่ายทำ", "ขอ template call sheet", "อุปกรณ์ที่ต้องเตรียมสำหรับถ่ายในสตูดิโอ"],
  intern_mentor: ["ฉันควรเรียนรู้อะไรในสัปดาห์แรก", "ขอคำแนะนำการทำงานกับทีม content", "อยากเก่งขึ้นเรื่อง production ทำยังไงดี"],
  social_caption: ["เขียนแคปชันโปรโมตโชว์สแตนด์อัพ", "คิดแคปชันสนุก ๆ สำหรับ Instagram", "เขียน 3 เวอร์ชันสำหรับโพสต์นี้"],
  meeting_summary: ["สรุปประชุมจากโน้ตนี้", "ดึง action items จากบันทึก", "เขียนสรุปแบบ bullet"],
};

export default async function AgentChatPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("key, name, description, access")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (!agent) {
    return <EmptyState icon="Bot" title="ไม่พบ AI agent นี้" />;
  }
  const access = (agent.access as any) ?? {};
  if (access.owner_only && !ctx.isOwner) redirect("/ai-workplace");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("full_name, email")
    .eq("id", ctx.userId)
    .maybeSingle();
  const userName = appUser?.full_name || appUser?.email || "คุณ";

  return (
    <div>
      <Link href="/ai-workplace" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> AI Workplace
      </Link>
      <div className="flex items-center gap-3 mb-4">
        <div className="grid place-items-center size-11 rounded-xl2 bg-grape-soft text-grape">
          <Icon name="Bot" className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{agent.name}</h1>
            <Badge tone="grape">Claude</Badge>
          </div>
          <p className="text-sm text-muted">{agent.description}</p>
        </div>
      </div>

      <AgentChat agentKey={agent.key} agentName={agent.name} userName={userName} starters={STARTERS[agent.key] ?? []} />
    </div>
  );
}
