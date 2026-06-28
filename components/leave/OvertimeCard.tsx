import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { OT_RATE, OT_TYPE_LABEL, OT_TYPES, OT_NOT_ELIGIBLE } from "@/lib/ot";
import { OvertimeForm } from "@/components/leave/OvertimeForm";

// การ์ด "ทำงานล่วงเวลา (OT)" — ของพนักงานคนปัจจุบัน
export async function OvertimeCard({ employeeId }: { employeeId: string }) {
  const admin = createAdminClient();
  const year = new Date().getFullYear();
  const { data: rows } = await admin
    .from("ot_requests")
    .select("id, work_date, ot_type, amount, reason, status, reviewer_comment, created_at")
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false });

  const all = rows ?? [];
  const thisYear = all.filter((r: any) => (r.work_date ?? "").startsWith(`${year}`));
  const approved = thisYear.filter((r: any) => r.status === "approved");
  const pending = all.filter((r: any) => r.status === "pending");
  const earned = approved.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Icon name="Clock" className="size-5 text-gold" />
          <h2 className="font-semibold text-base">ทำงานล่วงเวลา (OT)</h2>
          <span className="chip bg-brand-soft text-gold">เหมา {OT_RATE.toLocaleString()} / ครั้ง</span>
        </div>
        <OvertimeForm />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl2 border border-sand p-4">
          <span className="font-semibold text-base">💰 OT ที่อนุมัติแล้วปีนี้</span>
          <div className="mt-2 text-3xl font-extrabold">
            {earned.toLocaleString()}
            <span className="text-base font-normal text-muted"> บาท</span>
          </div>
          <p className="text-sm text-muted mt-2">{approved.length} ครั้งปีนี้</p>
        </div>
        <div className="rounded-xl2 border border-sand p-4">
          <span className="font-semibold text-base">⏳ รออนุมัติ</span>
          <div className="mt-2 text-3xl font-extrabold">
            {pending.length} <span className="text-base font-normal text-muted">ครั้ง</span>
          </div>
          <p className="text-sm text-muted mt-2">หัวหน้า/ผู้อนุมัติกำลังตรวจ</p>
        </div>
      </div>

      {/* เงื่อนไขที่ตกลงกัน */}
      <div className="mt-4 rounded-xl bg-sand/40 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted">เบิก OT ได้เมื่อ</p>
        {OT_TYPES.map((t) => (
          <div key={t.key} className="flex gap-2 text-xs">
            <Icon name="Check" className="size-3.5 text-mint shrink-0 mt-0.5" />
            <span><b>{t.label}</b> — {t.desc}</span>
          </div>
        ))}
        <div className="flex gap-2 text-xs text-muted pt-0.5">
          <Icon name="Minus" className="size-3.5 shrink-0 mt-0.5" />
          <span>{OT_NOT_ELIGIBLE}</span>
        </div>
      </div>

      {/* ประวัติ */}
      {all.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted">ประวัติการเบิก OT</p>
          {all.slice(0, 8).map((r: any) => {
            const sb = statusBadge(r.status);
            return (
              <div key={r.id} className="flex items-center gap-3 text-sm border-t border-sand/70 pt-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{OT_TYPE_LABEL[r.ot_type] ?? "OT"}</div>
                  <div className="text-xs text-muted">
                    {formatThaiDate(r.work_date)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </div>
                </div>
                <span className="text-sm font-semibold">{Number(r.amount).toLocaleString()}฿</span>
                <Badge tone={sb.tone}>{sb.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
