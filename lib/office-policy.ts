// Only current staff records may enter the office; Google email/domain alone is insufficient.
export const STAFF_TYPES = new Set(["full_time", "probation", "part_time", "hybrid", "intern"]);
export const STAFF_STATUSES = new Set(["active", "probation", "intern"]);

export function isCurrentStaff(employee: { user_id?: string | null; status?: string; employment_types?: { key?: string } | null } | null, userId: string): boolean {
  return !!employee && employee.user_id === userId && STAFF_STATUSES.has(employee.status ?? "") && STAFF_TYPES.has(employee.employment_types?.key ?? "");
}

export function localReturnPath(value: string | null, fallback = "/office"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return fallback;
  const url = new URL(value, "https://people.yuendeaw.com");
  return url.origin === "https://people.yuendeaw.com" ? url.pathname + url.search + url.hash : fallback;
}
