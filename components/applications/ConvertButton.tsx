"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

/** Convert an applicant into an employee record, carrying over their data. */
export function ConvertButton({ app }: { app: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIntern = app.kind === "internship";

  async function convert() {
    if (!confirm(`แปลง "${app.full_name}" เป็น${isIntern ? "เด็กฝึกงาน" : "พนักงาน"}?`)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();

    // pick a sensible default employment type
    const wantKey = isIntern ? "intern" : "full_time";
    const { data: et } = await supabase
      .from("employment_types")
      .select("id")
      .eq("key", wantKey)
      .maybeSingle();

    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .insert({
        first_name: app.full_name,
        nickname: app.nickname || null,
        email: app.email || null,
        phone: app.phone || null,
        position_title: app.position || null,
        employment_type_id: et?.id ?? null,
        status: isIntern ? "active" : "probation",
      })
      .select("id")
      .single();

    if (empErr) {
      setError(empErr.message);
      setBusy(false);
      return;
    }

    await supabase
      .from("applications")
      .update({
        stage: isIntern ? "converted_intern" : "converted_employee",
        converted_employee_id: emp.id,
      })
      .eq("id", app.id);

    router.push(`/people/${emp.id}/edit`);
    router.refresh();
  }

  if (app.converted_employee_id) {
    return (
      <button
        onClick={() => router.push(`/people/${app.converted_employee_id}`)}
        className="btn bg-mint-soft text-mint text-xs px-2.5 py-1.5"
      >
        <Icon name="UserCheck" className="size-3.5" /> ดูพนักงาน
      </button>
    );
  }

  return (
    <button onClick={convert} disabled={busy} className="btn bg-brand text-ink text-xs px-2.5 py-1.5" title={error ?? ""}>
      <Icon name="UserPlus" className="size-3.5" /> {busy ? "…" : "แปลงเป็นพนักงาน"}
    </button>
  );
}
