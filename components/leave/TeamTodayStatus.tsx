import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";

// "ทีมวันนี้" — ใครวันนี้ WFH / ออกกอง / ลาหยุด (ทุกคนเห็น เพื่อวางแผนงาน)
export async function TeamTodayStatus() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("leave_requests")
    .select(
      "id, leave_types(key), employees!leave_requests_employee_id_fkey(first_name, nickname, avatar_url)"
    )
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  const rows = (data ?? []).filter((r: any) => r.employees);
  const wfh = rows.filter((r: any) => r.leave_types?.key === "wfh");
  const onsite = rows.filter((r: any) => ["onsite", "event"].includes(r.leave_types?.key));
  // ลา: ทุกอย่างที่ไม่ใช่ WFH/ออกกอง (ไม่โชว์ประเภท/เหตุผล เพื่อความเป็นส่วนตัว)
  const leave = rows.filter((r: any) => !["wfh", "onsite", "event"].includes(r.leave_types?.key));

  const groups = [
    { key: "wfh", label: "🏠 Work from home", items: wfh },
    { key: "onsite", label: "🎬 ออกกอง / นอกสถานที่", items: onsite },
    { key: "leave", label: "🌴 ลาหยุด", items: leave },
  ].filter((g) => g.items.length > 0);

  return (
    <Card>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <Icon name="Users" className="size-4 text-gold" /> ทีมวันนี้
        <span className="text-xs font-normal text-muted">{formatThaiDate(today)}</span>
      </h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">วันนี้ทุกคนเข้าออฟฟิศ 🎉</p>
      ) : (
        <div className="grid sm:grid-cols-3 gap-5">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold text-muted mb-2">{g.label} ({g.items.length})</p>
              <div className="space-y-2">
                {g.items.map((r: any) => {
                  const e = r.employees;
                  return (
                    <div key={r.id} className="flex items-center gap-2">
                      <Avatar name={e.nickname || e.first_name} src={e.avatar_url} size={28} />
                      <span className="text-sm">{e.nickname || e.first_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
