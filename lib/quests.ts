// Growth Quest — types, labels, and the performance-point scoring model.

export const QUEST_TYPES = [
  { key: "learning", th: "เรียนรู้", en: "Learning", emoji: "📚", tone: "grape", base: [10, 30] as [number, number] },
  { key: "business", th: "ธุรกิจ / รายได้", en: "Business", emoji: "💰", tone: "mint", base: [50, 150] as [number, number] },
  { key: "content", th: "คอนเทนต์", en: "Content", emoji: "🎬", tone: "brand", base: [30, 100] as [number, number] },
  { key: "project", th: "โปรเจกต์", en: "Project", emoji: "🚀", tone: "amber", base: [30, 80] as [number, number] },
  { key: "culture", th: "วัฒนธรรม", en: "Culture", emoji: "🤝", tone: "rose", base: [10, 40] as [number, number] },
];

export function questType(key: string) {
  return QUEST_TYPES.find((t) => t.key === key) ?? QUEST_TYPES[0];
}

export const QUEST_STATUS: Record<string, { th: string; tone: string }> = {
  draft: { th: "ร่าง", tone: "sand" },
  submitted: { th: "รอ Owner ตรวจ", tone: "grape" },
  needs_revision: { th: "ขอแก้ไข", tone: "amber" },
  awaiting_employee: { th: "รอพนักงานยืนยัน", tone: "amber" },
  in_progress: { th: "กำลังทำ", tone: "brand" },
  submitted_for_review: { th: "รอตรวจผลงาน", tone: "grape" },
  completed: { th: "สำเร็จ 🎉", tone: "mint" },
  failed: { th: "ไม่สำเร็จ", tone: "rose" },
  cancelled: { th: "ยกเลิก", tone: "sand" },
};

export const TIERS: Record<string, { th: string; emoji: string; color: string }> = {
  bronze: { th: "Bronze", emoji: "🥉", color: "#CD7F32" },
  silver: { th: "Silver", emoji: "🥈", color: "#9AA3AD" },
  gold: { th: "Gold", emoji: "🥇", color: "#E8A317" },
  legendary: { th: "Legendary", emoji: "👑", color: "#6C5CE7" },
};

export const REWARD_KINDS = [
  { key: "cash", th: "เงินโบนัส", emoji: "💵" },
  { key: "learning", th: "ค่าเรียน / คอร์ส", emoji: "🎓" },
  { key: "time", th: "วันหยุดพิเศษ / WFA", emoji: "🏖️" },
  { key: "experience", th: "ประสบการณ์ (ดินเนอร์/ทริป)", emoji: "🎟️" },
  { key: "equipment", th: "อุปกรณ์ช่วยงาน", emoji: "🎧" },
  { key: "career", th: "โอกาสในสายงาน (lead/เครดิต)", emoji: "🌟" },
];

export function rewardKind(key: string) {
  return REWARD_KINDS.find((r) => r.key === key) ?? REWARD_KINDS[0];
}

// completion outcome → performance multiplier
export const COMPLETION = [
  { key: "under", th: "ต่ำกว่าเป้า แต่พยายามชัดเจน", mult: 0.4 },
  { key: "met", th: "สำเร็จตามเป้า", mult: 1.0 },
  { key: "exceeded", th: "เกินเป้า", mult: 1.3 },
  { key: "impact", th: "สร้าง impact ใหญ่กว่าที่ตกลง", mult: 2.0 },
];

/**
 * Base points = the quest's weight, decided when Owner approves.
 * Scales within the type's range by difficulty(1-4) · impact(1-4) · evidence(1-3).
 * This is what stops "easy quests for free badges".
 */
export function computeBase(type: string, difficulty = 2, impact = 2, evidence = 2) {
  const [min, max] = questType(type).base;
  const factor = (difficulty / 4) * 0.4 + (impact / 4) * 0.4 + (evidence / 3) * 0.2;
  return Math.round(min + (max - min) * factor);
}

/** Final performance points = base × completion multiplier. */
export function performancePoints(base: number, completionKey: string) {
  const mult = COMPLETION.find((c) => c.key === completionKey)?.mult ?? 1;
  return Math.round(base * mult);
}

/** Suggest a badge tier from how the quest landed. */
export function suggestTier(completionKey: string, impact = 2): string {
  if (completionKey === "impact") return "legendary";
  if (completionKey === "exceeded") return impact >= 3 ? "gold" : "silver";
  if (completionKey === "met") return "silver";
  return "bronze";
}
