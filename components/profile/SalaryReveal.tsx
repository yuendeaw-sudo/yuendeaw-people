"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { formatTHB } from "@/lib/utils";

const COMP_LABEL: Record<string, string> = {
  monthly_salary: "ต่อเดือน",
  monthly: "ต่อเดือน",
  daily_wage: "ต่อวัน",
  per_day: "ต่อวัน",
  daily: "ต่อวัน",
  hourly: "ต่อชั่วโมง",
  per_show: "ต่อโชว์",
  project: "ต่อโปรเจกต์",
};

// Thai social security: 5% of wage, wage floored 1,650 capped 15,000 → max 750/mo.
function computeSSO(salary: number) {
  if (!salary || salary <= 0) return 0;
  return Math.round(Math.min(Math.max(salary, 1650), 15000) * 0.05);
}

const MASK = "••••••";

export function SalaryReveal({
  amount,
  compType,
  ssoEnrolled = true,
  withholding = false,
}: {
  amount: number;
  compType: string;
  ssoEnrolled?: boolean;
  withholding?: boolean;
}) {
  const [show, setShow] = useState(false);
  const label = COMP_LABEL[compType] || compType;

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{show ? formatTHB(amount) : "฿ ••••••"}</span>
          <span className="text-sm text-muted">/ {label}</span>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-sand/60 transition"
          title={show ? "ซ่อน" : "แสดง"}
          aria-label={show ? "ซ่อนเงินเดือน" : "แสดงเงินเดือน"}
        >
          <Icon name={show ? "EyeOff" : "Eye"} className="size-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <Line label="สิทธิ์ประกันสังคม">
          {ssoEnrolled ? (
            <span className="text-mint font-medium">ขึ้นสิทธิ์ประกันสังคม</span>
          ) : (
            <span className="text-muted">ไม่ขึ้นประกันสังคม</span>
          )}
        </Line>
        <Line label="ประกันสังคม / เดือน">
          {ssoEnrolled ? (show ? formatTHB(computeSSO(amount)) : MASK) : "—"}
        </Line>
        <Line label="หัก ณ ที่จ่าย">
          {withholding ? "หัก ณ ที่จ่าย (3%)" : "ไม่หัก"}
        </Line>
      </div>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm border-t border-sand/50 pt-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
