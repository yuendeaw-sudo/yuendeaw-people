"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function BonusActions({ id, status, canApprove }: { id: string; status: string; canApprove: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: string, paymentStatus?: string) {
    setBusy(true);
    const supabase = createClient();
    const patch: any = { status: next };
    if (paymentStatus) patch.payment_status = paymentStatus;
    await supabase.from("bonus_requests").update(patch).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  if (!canApprove) return null;

  return (
    <div className="flex gap-1.5">
      {(status === "proposed" || status === "hr_review") && (
        <>
          <button onClick={() => set("approved")} disabled={busy} className="btn bg-mint text-white text-xs px-2.5 py-1.5">
            <Icon name="Check" className="size-3.5" /> อนุมัติ
          </button>
          <button onClick={() => set("rejected")} disabled={busy} className="btn bg-rose-soft text-rose text-xs px-2.5 py-1.5">
            <Icon name="X" className="size-3.5" />
          </button>
        </>
      )}
      {status === "approved" && (
        <button onClick={() => set("paid", "paid")} disabled={busy} className="btn bg-brand text-ink text-xs px-2.5 py-1.5">
          <Icon name="BadgeCheck" className="size-3.5" /> ทำเครื่องหมายว่าจ่ายแล้ว
        </button>
      )}
    </div>
  );
}
