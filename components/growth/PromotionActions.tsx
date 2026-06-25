"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function PromotionActions({ id, status, canApprove }: { id: string; status: string; canApprove: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    setBusy(true);
    await createClient().from("promotion_requests").update({ status: next }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  if (!canApprove || status === "approved" || status === "rejected") return null;

  return (
    <div className="flex gap-1.5">
      <button onClick={() => set("approved")} disabled={busy} className="btn bg-mint text-white text-xs px-2.5 py-1.5">
        <Icon name="Check" className="size-3.5" /> อนุมัติ
      </button>
      <button onClick={() => set("rejected")} disabled={busy} className="btn bg-rose-soft text-rose text-xs px-2.5 py-1.5">
        <Icon name="X" className="size-3.5" />
      </button>
    </div>
  );
}
