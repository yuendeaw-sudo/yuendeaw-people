import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge } from "@/components/ui";
import { OTApprovalRow } from "@/components/leave/OTApprovalRow";

// คิวอนุมัติ OT — เห็นโดยเจ้าของ/ผู้มีสิทธิ์อนุมัติลา
export async function OTApprovals() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ot_requests")
    .select("id, employee_id, work_date, ot_type, amount, hours, reason, employees!ot_requests_employee_id_fkey(first_name, nickname)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pending = (data ?? []).filter((r: any) => r.employees);
  if (pending.length === 0) return null; // ไม่มีคิว → ไม่ต้องโชว์

  return (
    <Card>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        OT รออนุมัติ
        <Badge tone="amber">{pending.length}</Badge>
      </h2>
      <div className="space-y-2">
        {pending.map((r: any) => (
          <OTApprovalRow key={r.id} req={r} />
        ))}
      </div>
    </Card>
  );
}
