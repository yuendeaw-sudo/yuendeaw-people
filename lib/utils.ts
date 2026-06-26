import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTHB(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Normalize a date's year to ค.ศ. (Gregorian). If a user typed the year as
 * พ.ศ. (Buddhist, ~543 ahead — e.g. 2569), convert it to ค.ศ. (2026).
 * Leaves real Gregorian years (≤2200) untouched. Input/output: "YYYY-MM-DD".
 */
export function toCE(d: string | null | undefined): string {
  if (!d) return "";
  const m = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  let year = parseInt(m[1], 10);
  if (year > 2200) year -= 543; // Buddhist era → Gregorian
  return `${String(year).padStart(4, "0")}-${m[2]}-${m[3]}`;
}

/** Format a reward amount by its unit: บาท / percent / days. */
export function formatReward(amount: number | null | undefined, unit?: string | null) {
  if (amount == null) return "—";
  if (unit === "percent") return `${amount}%`;
  if (unit === "days") return `${amount} วัน`;
  return formatTHB(amount);
}

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatThaiDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${TH_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
