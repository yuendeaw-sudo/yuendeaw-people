import Anthropic from "@anthropic-ai/sdk";
import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  agentForLineGroup,
  detectLineTrigger,
  opaqueLineEventHash,
  parseGeneralLineGroupAgents,
  verifyLineSignature,
  isGeneralLineAssistant,
  LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT,
  LINE_GENERAL_ASSISTANT_NAME,
  LINE_GENERAL_ASSISTANT_KEY,
  isLineGroupDiscoveryCommand,
  isWellFormedLineGroupId,
  type LineMention,
} from "@/lib/line-ai/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPLY_API = "https://api.line.me/v2/bot/message/reply";
const MAX_EVENTS_PER_WEBHOOK = 20;
const MAX_PROMPT_LENGTH = 2500;
const MAX_PER_GROUP_PER_MINUTE = 8;

type LineTextEvent = {
  type?: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: { type?: string; groupId?: string; roomId?: string };
  message?: { type?: string; text?: string; mention?: LineMention };
};
type LinePayload = { destination?: string; events?: LineTextEvent[] };
type LineConfig = {
  token: string;
  agentMap: Record<string, string>;
  model: string;
};

type LineSetup =
  | { secret: string; token: string; mode: "group-discovery" }
  | { secret: string; token: string; mode: "assistant"; config: LineConfig };
type Admin = ReturnType<typeof createAdminClient>;

/** Never start LINE AI without its separate channel secret, token and mode. */
function configOrNull(): LineSetup | null {
  const secret = process.env.LINE_AI_CHANNEL_SECRET;
  const token = process.env.LINE_AI_CHANNEL_ACCESS_TOKEN;
  if (!secret || !token) return null;

  const assistantEnabled = process.env.LINE_AI_ENABLED === "true";
  const discoveryEnabled = process.env.LINE_AI_GROUP_DISCOVERY_MODE === "true";

  // Discovery responds with the requesting group ID only. It must never
  // overlap with AI access or permit unapproved groups to query a model.
  if (assistantEnabled && discoveryEnabled) return null;
  if (discoveryEnabled) return { secret, token, mode: "group-discovery" };
  if (!assistantEnabled) return null;

  const model = process.env.LINE_AI_MODEL;
  const encodedMap = process.env.LINE_AI_GROUP_AGENTS_JSON;
  if (!model || !encodedMap || !process.env.ANTHROPIC_API_KEY) return null;

  try {
    const agentMap = parseGeneralLineGroupAgents(encodedMap);
    return { secret, token, mode: "assistant", config: { token, model, agentMap } };
  } catch {
    return null;
  }
}

async function replyLine(replyToken: string, text: string, token: string): Promise<void> {
  const reply = text.trim().slice(0, 4900) || "ยังไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่อีกครั้ง";
  const res = await fetch(REPLY_API, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: reply }],
    }),
    signal: AbortSignal.timeout(8500),
  });
  if (!res.ok) throw new Error("LINE_REPLY_STATUS_" + res.status);
}

async function markEvent(
  admin: Admin,
  eventHash: string,
  status: "completed" | "failed" | "rate_limited",
  errorCode?: string,
): Promise<void> {
  await admin.from("ai_line_webhook_events").update({
    status,
    completed_at: new Date().toISOString(),
    error_code: errorCode ?? null,
  }).eq("event_hash", eventHash);
}

/**
 * The only external identity grant is a verified LINE signature AND an
 * allowlisted group/room. We never trust a client-provided People OS user ID.
 */
async function processEvent(
  event: LineTextEvent,
  destination: string | undefined,
  config: LineConfig,
): Promise<void> {
  if (event.type !== "message" || event.message?.type !== "text") return;
  if (typeof event.message.text !== "string" ||
      typeof event.replyToken !== "string" ||
      typeof event.webhookEventId !== "string" ||
      event.webhookEventId.length > 140) return;

  const groupId = event.source?.groupId ?? event.source?.roomId;
  const agentKey = agentForLineGroup(groupId, config.agentMap);
  if (!groupId || !agentKey || !isGeneralLineAssistant(agentKey)) return;
  // No reply or AI billing for unknown groups/1:1 or unsupported specialists.

  const parsed = detectLineTrigger(event.message.text, event.message.mention, destination);
  if (!parsed.triggered) return;

  const eventHash = opaqueLineEventHash(event.webhookEventId);
  const groupHash = opaqueLineEventHash(groupId);
  const admin = createAdminClient();

  // Unique event hashes prevent replaying the same LINE webhook/AI request.
  // Deploy the gated database migration BEFORE enabling the webhook.
  const { data: claimed, error: claimError } = await admin
    .from("ai_line_webhook_events")
    .upsert(
      { event_hash: eventHash, group_hash: groupHash, agent_key: agentKey, status: "processing" },
      { onConflict: "event_hash", ignoreDuplicates: true },
    )
    .select("event_hash");
  if (claimError) throw new Error("EVENT_CLAIM_FAILED");
  if (!claimed?.length) return;

  try {
    const { count, error: countError } = await admin
      .from("ai_line_webhook_events")
      .select("event_hash", { head: true, count: "exact" })
      .eq("group_hash", groupHash)
      .gte("received_at", new Date(Date.now() - 60_000).toISOString());
    if (countError) throw new Error("RATE_LIMIT_READ_FAILED");
    if ((count ?? 0) > MAX_PER_GROUP_PER_MINUTE) {
      await markEvent(admin, eventHash, "rate_limited");
      await replyLine(event.replyToken, "ตอนนี้มีคำถามเข้ามาหลายรายการ กรุณาลองใหม่ในอีกสักครู่", config.token);
      return;
    }

    // Aoy is an explicitly approved general-purpose assistant. No specialist
    // agent row, privileged prompt, or company Knowledge Base is loaded.

    const prompt = parsed.prompt.slice(0, MAX_PROMPT_LENGTH);
    if (!prompt) {
      await replyLine(event.replyToken, `สวัสดีครับ ผม${LINE_GENERAL_ASSISTANT_NAME} ช่วยคิดไอเดีย ตอบคำถาม เขียนข้อความ หรือสรุปงานได้ครับ พิมพ์คำถามหลัง ai หรือ อ๋อย ได้เลย`, config.token);
      await markEvent(admin, eventHash, "completed");
      return;
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: 16_000,
    });
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 1200,
      system: LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Log usage metrics only. Never persist raw group messages or LINE tokens.
    await admin.from("ai_usage_logs").insert({
      agent_id: null,
      employee_id: null,
      tokens: response.usage.output_tokens,
      meta: {
        source: "line_ai",
        agent_key: LINE_GENERAL_ASSISTANT_KEY,
        model: config.model,
        event_hash: eventHash,
        group_hash: groupHash,
        input_tokens: response.usage.input_tokens,
      },
    });

    await replyLine(event.replyToken, text, config.token);
    await markEvent(admin, eventHash, "completed");
  } catch {
    // No raw message, reply token, group ID, or credentials in logs.
    await markEvent(admin, eventHash, "failed", "PROCESSING_FAILED");
    try {
      await replyLine(event.replyToken, "ผู้ช่วย AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", config.token);
    } catch {
      // LINE reply tokens can expire or be consumed; avoid duplicate replies.
    }
  }
}

/**
 * A signed, opt-in LINE-only discovery flow for rebuilding the deleted group
 * mapping. It discloses an ID only within its own LINE group and never reads
 * People OS data, calls an AI model, or stores identifiers in Supabase/logs.
 */
async function handleGroupDiscovery(event: LineTextEvent, token: string): Promise<void> {
  if (event.type !== "message" || event.message?.type !== "text") return;
  if (typeof event.replyToken !== "string" || typeof event.message.text !== "string") return;
  if (!isLineGroupDiscoveryCommand(event.message.text)) return;

  const groupId = event.source?.groupId ?? event.source?.roomId;
  if (!groupId || !isWellFormedLineGroupId(groupId)) return;

  await replyLine(
    event.replyToken,
    "รหัสกลุ่ม LINE ของคุณคือ:\n" + groupId +
      "\n\nรหัสนี้ใช้ลงทะเบียนอ๋อยในกลุ่มที่อนุญาตเท่านั้น " +
      "ตอนนี้อ๋อยยังไม่เปิดใช้งาน AI และไม่เก็บข้อความของคุณครับ",
    token,
  );
}

export async function POST(request: Request) {
  const setup = configOrNull();
  if (!setup) {
    return NextResponse.json({ error: "LINE_AI_NOT_CONFIGURED" }, { status: 503 });
  }
  const rawBody = await request.text();
  if (rawBody.length > 64_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"), setup.secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: LinePayload;
  try {
    payload = JSON.parse(rawBody) as LinePayload;
  } catch {
    return NextResponse.json({ error: "BAD_PAYLOAD" }, { status: 400 });
  }
  if (!Array.isArray(payload.events) || payload.events.length > MAX_EVENTS_PER_WEBHOOK) {
    return NextResponse.json({ error: "BAD_EVENTS" }, { status: 400 });
  }

  // LINE Developers' Verify action sends events: [] and expects HTTP 200.
  if (!payload.events.length) return NextResponse.json({ ok: true });

  after(async () => {
    for (const event of payload.events ?? []) {
      try {
        if (setup.mode === "group-discovery") {
          await handleGroupDiscovery(event, setup.token);
        } else {
          await processEvent(event, payload.destination, setup.config);
        }
      } catch {
        // Background processing errors are recorded without logging user data.
        console.error("[line-ai] webhook event failed");
      }
    }
  });

  return NextResponse.json({ ok: true });
}
