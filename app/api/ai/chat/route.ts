import Anthropic from "@anthropic-ai/sdk";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ในเซิร์ฟเวอร์", { status: 503 });
  }

  let body: { agentKey?: string; messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const messages = (body.messages ?? []).filter((m) => m.content?.trim());
  if (!messages.length) return new Response("no messages", { status: 400 });

  // Load the agent and its access rules
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id, name, system_prompt, access")
    .eq("key", body.agentKey ?? "")
    .eq("is_active", true)
    .maybeSingle();

  if (!agent) return new Response("ไม่พบ agent", { status: 404 });

  // Access check (owner sees all; owner_only blocks non-owner)
  const access = (agent.access as any) ?? {};
  if (access.owner_only && !ctx.isOwner) {
    return new Response("ไม่มีสิทธิ์เข้าถึง agent นี้", { status: 403 });
  }

  const system =
    (agent.system_prompt as string | null) ||
    `คุณคือ "${agent.name}" ผู้ช่วย AI ของทีม YuenDeaw (บริษัท content/comedy/creative ของไทย) ตอบเป็นภาษาไทยแบบเป็นกันเองแต่มืออาชีพ กระชับและช่วยให้ทำงานได้จริง`;

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const mstream = anthropic.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of mstream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // best-effort usage logging
        try {
          const final = await mstream.finalMessage();
          await supabase.from("ai_usage_logs").insert({
            employee_id: ctx.employeeId,
            agent_id: agent.id,
            tokens: final.usage.output_tokens,
            meta: { input_tokens: final.usage.input_tokens },
          });
        } catch {
          /* ignore logging errors */
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[เกิดข้อผิดพลาด: ${err?.message ?? "unknown"}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
