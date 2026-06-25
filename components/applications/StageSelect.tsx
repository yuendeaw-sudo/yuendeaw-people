"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STAGES: { key: string; label: string }[] = [
  { key: "new", label: "ใหม่" },
  { key: "reviewing", label: "กำลังพิจารณา" },
  { key: "shortlisted", label: "Shortlist" },
  { key: "interview", label: "สัมภาษณ์" },
  { key: "accepted", label: "รับ" },
  { key: "rejected", label: "ปฏิเสธ" },
  { key: "talent_pool", label: "Talent Pool" },
];

export function StageSelect({ id, stage }: { id: string; stage: string }) {
  const router = useRouter();
  const [value, setValue] = useState(stage);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setValue(next);
    setBusy(true);
    const supabase = createClient();
    await supabase.from("applications").update({ stage: next }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="text-xs rounded-lg border border-sand bg-surface px-2 py-1 font-medium outline-none focus:border-brand"
    >
      {STAGES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
