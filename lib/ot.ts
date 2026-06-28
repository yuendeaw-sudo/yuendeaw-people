// OT (ทำงานล่วงเวลา) — เรตต่อครั้ง "owner กำหนดรายคน" จากหน้าโปรไฟล์พนักงาน (employees.ot_rate)
// ถ้า owner ยังไม่ตั้งเรตให้คนนั้น ใช้ค่าเริ่มต้นนี้ (ไม่โชว์ label นี้ให้พนักงาน)
export const DEFAULT_OT_RATE = 600;

// เรตจริงของพนักงาน = ot_rate ที่ owner ตั้ง, ถ้าไม่มีใช้ค่าเริ่มต้น
export function otRate(empOtRate?: number | null): number {
  const n = Number(empOtRate);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OT_RATE;
}

export type OtType = {
  key: string;
  label: string; // ชื่อสั้นบนการ์ด/รายการ
  desc: string; // อธิบายเงื่อนไขที่ตกลงกัน
  icon: string;
};

export const OT_TYPES: OtType[] = [
  {
    key: "scope_studio",
    label: "เข้าออฟฟิศทำงานข้าม scope",
    desc: "มาทำงานที่ออฟฟิศในขอบเขตที่ตกลงเพิ่ม เช่น สาย Production มาช่วยเป็น Studio Specialist",
    icon: "Building2",
  },
  {
    key: "weekend_shoot",
    label: "ออกกองเสาร์–อาทิตย์ (PM)",
    desc: "ฝั่ง PM ออกกองในวันเสาร์–อาทิตย์",
    icon: "Clapperboard",
  },
];

export const OT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  OT_TYPES.map((t) => [t.key, t.label])
);

// ข้อยกเว้น — ไม่นับเป็น OT (โชว์ให้พนักงานเข้าใจตรงกัน)
export const OT_NOT_ELIGIBLE = "เปิด-ปิดสตูดิโอวันเสาร์–อาทิตย์ เป็นเวรผลัดเปลี่ยนกัน ไม่นับเป็น OT";
