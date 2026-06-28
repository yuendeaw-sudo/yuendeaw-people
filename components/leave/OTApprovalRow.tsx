"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { OT_TYPE_LABEL } from "@/lib/ot";

export function OTApprovalRow({ req }: { req: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected") {
    setBusy(status);
    try {
      const r = await fetch("/api/ot/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id, status }),
      });
      if (r.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const emp = req.employees;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/40 px-3 py-3">
      <Avatar name={emp?.nickname || emp?.first_name} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {emp?.first_name} {emp?.nickname && `(${emp.nickname})`}
        </div>
        <div className="text-xs text-muted">
          {OT_TYPE_LABEL[req.ot_type] ?? "OT"} · {formatThaiDate(req.work_date)} ·{" "}
          {Number(req.amount).toLocaleString()} บาท
        </div>
        {req.reason && <div className="text-xs text-muted mt-0.5 italic">“{req.reason}”</div>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => decide("approved")} disabled={!!busy} className="btn bg-mint text-white text-xs px-3 py-1.5">
          <Icon name="Check" className="size-3.5" /> อนุมัติ
        </button>
        <button onClick={() => decide("rejected")} disabled={!!busy} className="btn-outline !text-rose !border-rose/40 text-xs px-3 py-1.5">
          <Icon name="X" className="size-3.5" /> ปฏิเสธ
        </button>
      </div>
    </div>
  );
}
