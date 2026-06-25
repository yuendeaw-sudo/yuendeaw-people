"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function AckButton({
  pageId,
  employeeId,
  version,
  acked,
}: {
  pageId: string;
  employeeId: string;
  version: number;
  acked: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(acked);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <div className="chip bg-mint-soft text-mint">
        <Icon name="CheckCircle2" className="size-4" /> รับทราบแล้ว
      </div>
    );
  }

  async function ack() {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("handbook_acknowledgments")
      .insert({ page_id: pageId, employee_id: employeeId, version });
    setDone(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={ack} disabled={busy} className="btn-brand">
      <Icon name="Check" className="size-4" /> {busy ? "กำลังบันทึก…" : "กดรับทราบ"}
    </button>
  );
}
