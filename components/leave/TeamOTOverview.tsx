import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { OT_TYPE_LABEL } from "@/lib/ot";
import { OTApprovalRow } from "@/components/leave/OTApprovalRow";

// ภาพรวม OT ของทีม — รออนุมัติ (กดอนุมัติได้) + ยอดเดือนนี้ + ประวัติล่าสุด
export async function TeamOTOverview() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ot_requests")
    .select(
      "id, employee_id, work_date, ot_type, amount, hours, reason, status, created_at, employees!ot_requests_employee_id_fkey(first_name, nickname)"
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const all = (data ?? []).filter((r: any) => r.employees);
  const pending = all.filter((r: any) => r.status === "pending");
  const month = new Date().toISOString().slice(0, 7);
  const approvedMonth = all.filter((r: any) => r.status === "approved" && (r.work_date || "").startsWith(month));
  const monthTotal = approvedMonth.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const history = all.filter((r: any) => r.status !== "pending").slice(0, 10);

  return (
    <Card>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <Icon name="Clock" className="size-4 text-gold" /> ทำงานล่วงเวลา (OT) ของทีม
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-sand/40 p-3">
          <div className="text-xs text-muted">รออนุมัติ</div>
          <div className="text-2xl font-extrabold">{pending.length}</div>
        </div>
        <div className="rounded-xl bg-sand/40 p-3">
          <div className="text-xs text-muted">อนุมัติเดือนนี้</div>
          <div className="text-2xl font-extrabold">{approvedMonth.length}</div>
        </div>
        <div className="rounded-xl bg-sand/40 p-3">
          <div className="text-xs text-muted">ยอดเดือนนี้</div>
          <div className="text-2xl font-extrabold">{formatTHB(monthTotal)}</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber mb-2 flex items-center gap-1.5">
            <Icon name="Inbox" className="size-3.5" /> รออนุมัติ ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((r: any) => <OTApprovalRow key={r.id} req={r} />)}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted mb-2">ล่าสุด</p>
          <div className="space-y-1.5">
            {history.map((r: any) => {
              const sb = statusBadge(r.status);
              const emp = r.employees;
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm border-t border-sand/70 pt-2">
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="font-medium">{emp?.nickname || emp?.first_name}</span>
                      <span className="text-muted"> · {OT_TYPE_LABEL[r.ot_type] ?? "OT"}{r.hours ? ` · ${Number(r.hours)} ชม.` : ""}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {formatThaiDate(r.work_date)}{r.reason ? ` · ${r.reason}` : ""}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{Number(r.amount).toLocaleString()}฿</span>
                  <Badge tone={sb.tone}>{sb.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {all.length === 0 && <p className="text-sm text-muted">ยังไม่มีการเบิก OT</p>}
    </Card>
  );
}
