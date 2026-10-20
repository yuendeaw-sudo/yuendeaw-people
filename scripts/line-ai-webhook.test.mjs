import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyLineSignature,
  parseLineGroupAgents,
  parseGeneralLineGroupAgents,
  agentForLineGroup,
  detectLineTrigger,
  opaqueLineEventHash,
  LINE_GENERAL_ASSISTANT_KEY,
  LINE_GENERAL_ASSISTANT_NAME,
  LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT,
  isGeneralLineAssistant,
} from "../lib/line-ai/webhook.ts";

const groupA = "C1234567890abcdef";
const groupB = "R0987654321abcdef";
const secret = "local-test-secret-only";
const body = '{"destination":"Uabcdef","events":[]}';
const signature = createHmac("sha256", secret).update(body).digest("base64");

test("exact LINE raw body HMAC passes and tampered bodies fail", () => {
  assert.equal(verifyLineSignature(body, signature, secret), true);
  assert.equal(verifyLineSignature(body + " ", signature, secret), false);
  assert.equal(verifyLineSignature(body, "invalid", secret), false);
  assert.equal(verifyLineSignature(body, null, secret), false);
  assert.equal(verifyLineSignature(body, signature, ""), false);
});

test("LINE group mapping is strict and only allows explicit group IDs", () => {
  const map = parseLineGroupAgents(JSON.stringify({
    [groupA]: LINE_GENERAL_ASSISTANT_KEY,
    [groupB]: LINE_GENERAL_ASSISTANT_KEY,
  }));
  assert.equal(agentForLineGroup(groupA, map), "general_assistant");
  assert.equal(agentForLineGroup(groupB, map), "general_assistant");
  assert.equal(agentForLineGroup("Coutside987654321", map), null);
  assert.equal(agentForLineGroup(undefined, map), null);
  assert.throws(() => parseLineGroupAgents('{"__proto__":"admin"}'));
  assert.throws(() => parseLineGroupAgents("{}"));
  assert.throws(() => parseLineGroupAgents('{"C1234567890abcdef":"bad-agent!"}'));
});

test("general LINE configuration rejects all specialist agent mappings", () => {
  const allowed = parseGeneralLineGroupAgents(JSON.stringify({
    [groupA]: "general_assistant",
  }));
  assert.equal(agentForLineGroup(groupA, allowed), "general_assistant");
  assert.throws(() => parseGeneralLineGroupAgents(JSON.stringify({
    [groupA]: "production_assistant",
  })));
  assert.throws(() => parseGeneralLineGroupAgents(JSON.stringify({
    [groupA]: "general_assistant",
    [groupB]: "sales_proposal",
  })));
});

test("Aoy is a general-purpose assistant, not a department-specific agent", () => {
  assert.equal(LINE_GENERAL_ASSISTANT_NAME, "อ๋อย");
  assert.equal(LINE_GENERAL_ASSISTANT_KEY, "general_assistant");
  assert.equal(isGeneralLineAssistant(LINE_GENERAL_ASSISTANT_KEY), true);
  assert.equal(isGeneralLineAssistant("production_assistant"), false);
  assert.equal(isGeneralLineAssistant("sales_proposal"), false);
  assert.match(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT, /ผู้ช่วย AI ทั่วไป/);
  assert.match(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT, /เขียนและแก้ข้อความ/);
  assert.match(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT, /ระดมไอเดีย/);
  assert.match(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT, /ไม่จำกัดตัวเองว่าเป็นฝ่าย Production/);
  assert.match(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT, /ห้ามเดา/);
  assert.ok(LINE_GENERAL_ASSISTANT_SYSTEM_PROMPT.includes("\n"), "System prompt must retain paragraph breaks");
});

test("preserves old Thai/English triggers but ignores unrelated messages", () => {
  assert.deepEqual(detectLineTrigger("ai สรุปงาน"), { triggered: true, prompt: "สรุปงาน" });
  assert.deepEqual(detectLineTrigger("น้องอ๋อย: ช่วยเขียนโพสต์"), { triggered: true, prompt: "ช่วยเขียนโพสต์" });
  assert.deepEqual(detectLineTrigger("อ๋อย"), { triggered: true, prompt: "" });
  assert.deepEqual(detectLineTrigger("วันนี้มีการประชุม"), { triggered: false, prompt: "" });
  assert.deepEqual(detectLineTrigger("rainy day"), { triggered: false, prompt: "" });
});

test("bot mention removes only the bot mention by its range", () => {
  assert.deepEqual(
    detectLineTrigger("@AI ช่วยคิดแคปชัน", {
      mentionees: [{ index: 0, length: 3, userId: "Ubot" }],
    }, "Ubot"),
    { triggered: true, prompt: "ช่วยคิดแคปชัน" },
  );
});

test("event/group hashes are deterministic and do not contain raw IDs", () => {
  const a = opaqueLineEventHash("01H810YECXQQZ37VAXPF6H9E6T");
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, opaqueLineEventHash("01H810YECXQQZ37VAXPF6H9E6T"));
  assert.notEqual(a, opaqueLineEventHash("other-event-id"));
});
