"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { formatTHB } from "@/lib/utils";

const COMP_LABEL: Record<string, string> = {
  monthly_salary: "ต่อเดือน",
  monthly: "ต่อเดือน",
  daily_wage: "ต่อวัน",
  daily: "ต่อวัน",
  hourly: "ต่อชั่วโมง",
  project: "ต่อโปรเจกต์",
};

export function SalaryReveal({ amount, compType }: { amount: number; compType: string }) {
  const [show, setShow] = useState(false);
  const label = COMP_LABEL[compType] || compType;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">
          {show ? formatTHB(amount) : "฿ ••••••"}
        </span>
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
  );
}
