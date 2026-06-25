"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { notifyEmployee } from "@/lib/notify";

export function ApprovalRow({ req }: { req: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected") {
    setBusy(status);
    const supabase = createClient();
    const { data: au } = await supabase.auth.getUser();
    await supabase
      .from("leave_requests")
      .update({ status, decided_by: au.user?.id ?? null, decided_at: new Date().toISOString() })
      .eq("id", req.id);
    if (req.employee_id) {
      await notifyEmployee(req.employee_id, {
        title: status === "approved" ? "อนุมัติการลาแล้ว ✅" : "คำขอลาไม่ได้รับอนุมัติ",
        body: `${req.leave_types?.name} · ${formatThaiDate(req.start_date)}`,
        link: "/time-leave",
        kind: "leave",
      });
    }
    router.refresh();
    setBusy(null);
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
          {req.leave_types?.name} · {formatThaiDate(req.start_date)} – {formatThaiDate(req.end_date)} ·{" "}
          {req.total_days} วัน
        </div>
        {req.reason && <div className="text-xs text-muted mt-0.5 italic">“{req.reason}”</div>}
        {req.evidence_path && (
          <a
            href={`/api/leave/evidence/view?path=${encodeURIComponent(req.evidence_path)}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-gold hover:underline mt-1"
          >
            <Icon name="Paperclip" className="size-3" /> ดูใบรับรองแพทย์
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => decide("approved")} disabled={!!busy} className="btn bg-mint text-white text-xs px-3 py-1.5">
          <Icon name="Check" className="size-3.5" /> อนุมัติ
        </button>
        <button onClick={() => decide("rejected")} disabled={!!busy} className="btn bg-rose-soft text-rose text-xs px-3 py-1.5">
          <Icon name="X" className="size-3.5" /> ปฏิเสธ
        </button>
      </div>
    </div>
  );
}
