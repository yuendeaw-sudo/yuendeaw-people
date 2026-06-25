// Shared leave-entitlement math (used by the balance dashboard + request guard).

export function tenureMonths(start?: string | null) {
  if (!start) return 0;
  const s = new Date(start);
  if (isNaN(s.getTime())) return 0;
  const now = new Date();
  let m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() < s.getDate()) m -= 1;
  return Math.max(0, m);
}

export function annualEntitlement(tiers: { years: number; days: number }[], years: number) {
  let days = 0;
  for (const t of (tiers ?? []).slice().sort((a, b) => a.years - b.years)) {
    if (years >= t.years) days = t.days;
  }
  return days;
}

export type LeaveLimits = {
  annual: { locked: boolean; left: number; entitled: number; monthsToUnlock: number };
  personal: { left: number; entitled: number };
};

/**
 * Remaining quota for the request guard. "used" counts approved + pending so an
 * employee can't over-book beyond their entitlement.
 */
export async function computeLeaveLimits(
  supabase: any,
  employeeId: string,
  startDate?: string | null,
  employmentTypeKey = "full_time"
): Promise<LeaveLimits> {
  const year = new Date().getFullYear();
  const [{ data: policies }, { data: reqs }] = await Promise.all([
    supabase.from("leave_policies").select("annual_quota_days, rules, leave_types(key), employment_types(key)"),
    supabase
      .from("leave_requests")
      .select("total_days, leave_types(key)")
      .eq("employee_id", employeeId)
      .in("status", ["approved", "pending"])
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`),
  ]);

  const policyFor = (key: string) =>
    (policies ?? []).find((p: any) => {
      const et = p.employment_types?.key;
      return p.leave_types?.key === key && (!et || et === employmentTypeKey);
    }) ?? (policies ?? []).find((p: any) => p.leave_types?.key === key && p.employment_types?.key === "full_time");

  const usedOf = (key: string) =>
    (reqs ?? [])
      .filter((r: any) => r.leave_types?.key === key)
      .reduce((s: number, r: any) => s + Number(r.total_days || 0), 0);

  const months = tenureMonths(startDate);
  const years = Math.floor(months / 12);

  const annualPolicy: any = policyFor("annual");
  const tiers = annualPolicy?.rules?.tiers ?? [{ years: 1, days: annualPolicy?.annual_quota_days ?? 6 }];
  const annualEntitled = annualEntitlement(tiers, years);
  const annualUsed = usedOf("annual");

  const personalEntitled = Number(policyFor("personal")?.annual_quota_days ?? 3);
  const personalUsed = usedOf("personal");

  return {
    annual: {
      locked: years < 1,
      entitled: annualEntitled,
      left: Math.max(0, annualEntitled - annualUsed),
      monthsToUnlock: Math.max(0, 12 - months),
    },
    personal: {
      entitled: personalEntitled,
      left: Math.max(0, personalEntitled - personalUsed),
    },
  };
}
