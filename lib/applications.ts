// สายงานที่สนใจ (เลือกได้หลายข้อ จาก 4 หมวด)
export const INTERESTED_ROLES = [
  { key: "creative_content_creator", label: "Creative / Content Creator", emoji: "🎬" },
  { key: "production_manager", label: "Production Manager", emoji: "🎟️" },
  { key: "graphic_ai_designer", label: "Graphic / AI Designer", emoji: "🎨" },
  { key: "editor_studio_specialist", label: "Editor / Studio Specialist", emoji: "✂️" },
];
export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  INTERESTED_ROLES.map((r) => [r.key, r.label])
);

export const CURRENT_STATUS = [
  { key: "student", label: "นักศึกษา" },
  { key: "full_time_employee", label: "พนักงานประจำ" },
  { key: "freelance", label: "ฟรีแลนซ์" },
  { key: "unemployed", label: "กำลังว่าง / มองหางาน" },
  { key: "other", label: "อื่น ๆ" },
];

export const WORK_TYPES = [
  { key: "full_time", label: "ประจำ" },
  { key: "part_time", label: "พาร์ทไทม์" },
  { key: "freelance", label: "ฟรีแลนซ์" },
  { key: "internship", label: "ฝึกงาน" },
];

// Status pipeline
export const APP_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "ใหม่", tone: "grape" },
  hr_screening: { label: "รอ HR คัดกรอง", tone: "amber" },
  owner_review: { label: "รอ Owner พิจารณา", tone: "brand" },
  interview_shortlist: { label: "รอนัดสัมภาษณ์", tone: "brand" },
  interview_scheduled: { label: "นัดสัมภาษณ์แล้ว", tone: "brand" },
  interview_done: { label: "สัมภาษณ์เสร็จ", tone: "amber" },
  offer: { label: "ยื่นข้อเสนอ", tone: "mint" },
  accepted: { label: "ตอบรับ", tone: "mint" },
  moved_to_employee: { label: "เป็นพนักงานแล้ว", tone: "mint" },
  moved_to_intern: { label: "เป็นเด็กฝึกแล้ว", tone: "mint" },
  moved_to_freelance: { label: "เป็นฟรีแลนซ์แล้ว", tone: "mint" },
  talent_pool: { label: "Talent Pool", tone: "sand" },
  rejected: { label: "ไม่ผ่าน", tone: "rose" },
};
export function statusOf(s: string) {
  return APP_STATUS[s] ?? { label: s, tone: "sand" };
}

export const HR_SCORE_FIELDS = [
  { key: "portfolio_quality", label: "คุณภาพผลงาน" },
  { key: "communication", label: "การสื่อสาร" },
  { key: "creative_fit", label: "ความครีเอทีฟ" },
  { key: "culture_fit", label: "เข้ากับวัฒนธรรม" },
  { key: "reliability_signal", label: "ความน่าเชื่อถือ" },
];

export const HR_RECOMMENDATION = [
  { key: "strong_yes", label: "Strong Yes", tone: "mint" },
  { key: "yes", label: "Yes", tone: "brand" },
  { key: "maybe", label: "Maybe", tone: "amber" },
  { key: "no", label: "No", tone: "rose" },
];

export const DEFAULT_TAGS = [
  "strong_portfolio", "good_energy", "funny", "good_storytelling", "good_editor",
  "social_native", "good_visual_sense", "ai_skill", "production_mindset", "organized",
  "needs_training", "urgent_candidate", "freelance_potential", "intern_potential", "owner_favorite",
];

export const CREATIVE_QUESTIONS = [
  "ครีเอเตอร์ไทยที่คุณคิดว่า “ฉลาด” คือใคร เพราะอะไร?",
  "ถ้าให้คุณทำคลิปโปรโมตยืนเดี่ยว 30 วินาที คุณจะทำยังไง?",
  "คุณอยากให้คนจำคุณในที่ทำงานแบบไหน?",
];

export const ATTITUDE_QUESTIONS = [
  "คุณเคยทำงานภายใต้ deadline โหด ๆ ไหม เล่าเคสหนึ่ง",
  "ถ้าต้องทำงานเล็ก ๆ ซ้ำ ๆ แต่สำคัญ คุณโอเคไหม",
  "คุณคิดว่าคนทำคอนเทนต์ที่ดี ต้องมีนิสัยอะไร",
];

export const SOCIAL_KEYS = [
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
  { key: "other", label: "อื่น ๆ" },
];
