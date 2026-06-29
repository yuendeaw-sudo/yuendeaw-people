// อัตราแปลงโดยประมาณ — ปรับค่าได้ที่นี่จุดเดียว
export const USD_TO_THB = 36.5;

export const CURRENCIES = [
  { code: "THB", label: "บาท (฿)" },
  { code: "USD", label: "ดอลลาร์ ($)" },
];

// แปลงค่าใช้จ่ายเป็นบาทเสมอ (USD → คูณเรต)
export function toTHB(cost?: number | null, currency?: string | null): number {
  const c = Number(cost || 0);
  return currency === "USD" ? c * USD_TO_THB : c;
}
