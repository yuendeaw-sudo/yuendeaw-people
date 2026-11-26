import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CREATIVE_INTERN_SET } from "@/lib/applications";

export const HOMEWORK_ROLE = "creative_content_creator";
export const HOMEWORK_ROLE_TITLE = "Creative / Content Creator";
export const HOMEWORK_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function createHomeworkToken(id: string) { return `${id}.${randomBytes(32).toString("hex")}`; }
export function tokenApplicationId(token: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/.test(token) ? token.split(".")[0] : null;
}
export function validHomeworkToken(token: string, homework: any) {
  const stored = homework?.token_hash;
  if (!tokenApplicationId(token) || typeof stored !== "string" || !/^[0-9a-f]{64}$/.test(stored)) return false;
  return timingSafeEqual(Buffer.from(tokenHash(token), "hex"), Buffer.from(stored, "hex"));
}
export function homeworkExpired(homework: any, now = Date.now()) {
  const expires = Date.parse(homework?.expires_at);
  return !Number.isFinite(expires) || expires <= now;
}
export function homeworkQuestions() { return CREATIVE_INTERN_SET.questions; }
export function validateHomeworkAnswers(input: unknown, questions: ReturnType<typeof homeworkQuestions> = homeworkQuestions()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const answers: Record<string,string> = {};
  for (const q of questions) {
    const value = (input as Record<string,unknown>)[q.id];
    if (typeof value !== "string" || !value.trim() || value.length > 12000) return null;
    if (q.type === "single" && !/^[A-G]$/.test(value)) return null;
    answers[q.id] = value.trim();
  }
  return answers;
}
export function homeworkAnswerLabel(q: {type: string; options?: string[]}, answer: string) {
  return q.type === "single" && /^[A-G]$/.test(answer) ? `${answer}. ${q.options?.[answer.charCodeAt(0)-65] ?? ""}` : answer;
}
// Compare the JSON snapshot, so a concurrent invite/submission cannot overwrite another update.
export async function saveHomework(admin: any, application: any, homework: any, stage?: string) {
  const {data,error} = await admin.from("applications").update({answers:{...application.answers,homework},...(stage?{stage}:{})})
    .eq("id",application.id).eq("updated_at",application.updated_at).select("id,answers,updated_at").maybeSingle();
  if(error) throw new Error("บันทึกการบ้านไม่สำเร็จ");
  return data;
}
