// Shared Thai labels + tones for Phase 2 workflow modules.

export const INCIDENT_CATEGORIES: { v: string; label: string }[] = [
  { v: "late", label: "มาสาย / ขาดงาน" },
  { v: "quality", label: "คุณภาพงาน" },
  { v: "deadline", label: "ส่งงานไม่ทัน" },
  { v: "complaint", label: "ลูกค้าร้องเรียน" },
  { v: "asset", label: "ใช้ทรัพย์สินผิด" },
  { v: "confidentiality", label: "ละเมิดความลับ" },
  { v: "harassment", label: "การคุกคาม" },
  { v: "fraud", label: "ทุจริต / ไม่ซื่อสัตย์" },
  { v: "safety", label: "ความปลอดภัย" },
  { v: "policy", label: "ละเมิดนโยบาย" },
  { v: "custom", label: "อื่น ๆ" },
];

export const INCIDENT_LEVELS: { v: number; label: string; tone: string }[] = [
  { v: 1, label: "เล็กน้อย", tone: "sand" },
  { v: 2, label: "ปานกลาง", tone: "amber" },
  { v: 3, label: "ร้ายแรง", tone: "rose" },
  { v: 4, label: "วิกฤต", tone: "rose" },
];

export const INCIDENT_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "เปิดเคส", tone: "grape" },
  hr_review: { label: "HR พิจารณา", tone: "amber" },
  awaiting_explanation: { label: "รอคำชี้แจง", tone: "amber" },
  decided: { label: "ตัดสินแล้ว", tone: "brand" },
  closed: { label: "ปิดเคส", tone: "mint" },
};

export const CORRECTIVE_ACTIONS: { v: string; label: string }[] = [
  { v: "none", label: "ไม่ดำเนินการ" },
  { v: "coaching", label: "โค้ช / ให้คำแนะนำ" },
  { v: "verbal", label: "ตักเตือนด้วยวาจา" },
  { v: "written_warning", label: "หนังสือเตือน" },
  { v: "improvement_plan", label: "แผนพัฒนา (PIP)" },
  { v: "suspension", label: "เสนอพักงาน" },
  { v: "termination", label: "เสนอเลิกจ้าง" },
];

export const REQUEST_STATUS: Record<string, { label: string; tone: string }> = {
  proposed: { label: "เสนอแล้ว", tone: "grape" },
  hr_review: { label: "HR พิจารณา", tone: "amber" },
  approved: { label: "อนุมัติ", tone: "mint" },
  rejected: { label: "ไม่อนุมัติ", tone: "rose" },
  paid: { label: "จ่ายแล้ว", tone: "mint" },
};

export const BONUS_CATEGORIES: { v: string; label: string }[] = [
  { v: "performance", label: "โบนัสผลงาน" },
  { v: "spot", label: "Spot Bonus" },
  { v: "project", label: "โบนัสโปรเจกต์" },
  { v: "travel", label: "Travel Bonus" },
  { v: "other", label: "อื่น ๆ" },
];

// แค็ตตาล็อกรางวัล/สวัสดิการที่เจ้าของให้พนักงานได้
// unit: "baht" = เงินบาท · "salary" = ปรับเงินเดือน (เลือก % หรือ บาท) · "days" = จำนวนวัน
export const REWARD_TYPES: { v: string; label: string; icon: string; unit: "baht" | "salary" | "days" }[] = [
  { v: "salary", label: "ปรับเงินเดือน", icon: "TrendingUp", unit: "salary" },
  { v: "performance", label: "โบนัสผลงาน", icon: "Award", unit: "baht" },
  { v: "travel", label: "ทริปท่องเที่ยว", icon: "Plane", unit: "baht" },
  { v: "health", label: "สุขภาพ / ความงาม", icon: "HeartPulse", unit: "baht" },
  { v: "learning", label: "งบเรียนรู้", icon: "GraduationCap", unit: "baht" },
  { v: "equipment", label: "ค่าอุปกรณ์", icon: "Laptop", unit: "baht" },
  { v: "meal_transport", label: "ค่าอาหาร / เดินทาง", icon: "Utensils", unit: "baht" },
  { v: "leave_days", label: "ลาพักร้อน (วัน)", icon: "Palmtree", unit: "days" },
];

export const PERF_DIMENSIONS: { key: string; label: string }[] = [
  { key: "output", label: "Output — ส่งงานได้จริง" },
  { key: "quality", label: "Quality — คุณภาพงาน" },
  { key: "reliability", label: "Reliability — ไว้ใจได้" },
  { key: "teamwork", label: "Teamwork — ทำให้ทีมดีขึ้น" },
  { key: "growth", label: "Growth — เรียนรู้เร็ว" },
  { key: "initiative", label: "Initiative — กล้าคิดกล้าเสนอ" },
  { key: "business_impact", label: "Business Impact — สร้างผลทางธุรกิจ" },
  { key: "culture_fit", label: "Culture Fit — เข้ากับวัฒนธรรม" },
];

export const REVIEW_CYCLES: { v: string; label: string }[] = [
  { v: "weekly", label: "รายสัปดาห์" },
  { v: "monthly", label: "รายเดือน" },
  { v: "quarterly", label: "รายไตรมาส" },
  { v: "probation", label: "ทดลองงาน" },
  { v: "project", label: "จบโปรเจกต์" },
  { v: "intern", label: "จบฝึกงาน" },
];
