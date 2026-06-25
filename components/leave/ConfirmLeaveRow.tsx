"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";

export function ConfirmLeaveRow({ req }: { req: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(status: "approved" | "cancelled") {
    setBusy(true);
    await createClient().from("leave_requests").update({ status }).eq("id", req.id);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-soft/40 px-3 py-3">
      <div className="grid place-items-center size-9 rounded-full bg-amber-soft text-[#9a6b06] shrink-0">
        <Icon name="FileText" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {req.leave_types?.name} · {req.total_days} วัน
        </div>
        <div className="text-xs text-muted">
          {formatThaiDate(req.start_date)} – {formatThaiDate(req.end_date)}
          {req.reason && ` · ${req.reason}`}
        </div>
        {req.hr_comment && <div className="text-xs text-muted mt-0.5 italic">บันทึก HR: “{req.hr_comment}”</div>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => decide("approved")} disabled={busy} className="btn bg-mint text-white text-xs px-3 py-1.5">
          <Icon name="Check" className="size-3.5" /> ยืนยัน
        </button>
        <button onClick={() => decide("cancelled")} disabled={busy} className="btn bg-rose-soft text-rose text-xs px-3 py-1.5">
          ไม่ใช่
        </button>
      </div>
    </div>
  );
}
