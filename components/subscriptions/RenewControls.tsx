"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

// เลื่อนวันที่ไปอีก n รอบ (รายเดือน +n เดือน, รายปี +n ปี)
function addPeriods(ymd: string, cycle: string, n: number): string {
  const d = new Date(ymd + "T00:00:00");
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function RenewControls({
  id,
  renewalDate,
  billingDate,
  cycle,
  overdue,
}: {
  id: string;
  renewalDate: string;
  billingDate: string | null;
  cycle: string;
  overdue: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function renew() {
    setBusy("renew");
    const today = new Date().toISOString().slice(0, 10);
    // เลื่อนไปข้างหน้าจนกว่าจะเป็นวันในอนาคต (เผื่อค้างหลายรอบ)
    let n = 1;
    let next = addPeriods(renewalDate, cycle, n);
    while (next <= today) {
      n++;
      next = addPeriods(renewalDate, cycle, n);
    }
    const payload: any = { renewal_date: next, status: "active" };
    if (billingDate) payload.billing_date = addPeriods(billingDate, cycle, n);
    await createClient().from("subscriptions").update(payload).eq("id", id);
    setBusy(null);
    router.refresh();
  }

  async function noRenew() {
    if (!confirm("ยืนยัน “ไม่ต่ออายุ” — เปลี่ยนสถานะเป็นยกเลิก?")) return;
    setBusy("cancel");
    await createClient().from("subscriptions").update({ status: "cancelled" }).eq("id", id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className={`chip text-[11px] ${overdue ? "bg-rose-soft text-rose" : "bg-amber-soft text-[#9a6b06]"}`}>
        <Icon name="Clock" className="size-3" /> {overdue ? "เลยกำหนดต่ออายุ" : "ใกล้ครบกำหนด"}
      </span>
      <button onClick={renew} disabled={!!busy} className="btn bg-mint text-white text-[11px] px-2 py-1">
        <Icon name="Check" className="size-3" /> {busy === "renew" ? "…" : "ต่อแล้ว"}
      </button>
      <button onClick={noRenew} disabled={!!busy} className="btn-outline !text-rose !border-rose/40 text-[11px] px-2 py-1">
        ไม่ต่อ
      </button>
    </div>
  );
}
