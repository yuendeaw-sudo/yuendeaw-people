import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { WorkArrangementForm } from "@/components/leave/WorkArrangementForm";

/**
 * Work-from-home / on-site logging — NOT leave. Everyone may pick WFH up to
 * 20 times/year; ออกกอง (on-site) is unlimited. Self-service, auto-approved.
 */
export async function WorkArrangement({ employeeId }: { employeeId: string }) {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [{ data: types }, { data: wfhPolicy }, { data: rows }] = await Promise.all([
    supabase.from("leave_types").select("id, key").in("key", ["wfh", "onsite"]),
    supabase.from("leave_policies").select("annual_quota_days, leave_types(key)").order("created_at"),
    supabase
      .from("leave_requests")
      .select("start_date, leave_types(key)")
      .eq("employee_id", employeeId)
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`),
  ]);

  const wfhTypeId = (types ?? []).find((t) => t.key === "wfh")?.id ?? null;
  const onsiteTypeId = (types ?? []).find((t) => t.key === "onsite")?.id ?? null;
  const wfhQuota = Number((wfhPolicy ?? []).find((p: any) => p.leave_types?.key === "wfh")?.annual_quota_days ?? 20);

  const wfhUsed = (rows ?? []).filter((r: any) => r.leave_types?.key === "wfh").length;
  const onsiteUsed = (rows ?? []).filter((r: any) => r.leave_types?.key === "onsite").length;
  const wfhRemaining = Math.max(0, wfhQuota - wfhUsed);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Icon name="Laptop" className="size-5 text-grape" />
          <h2 className="font-semibold text-base">ทำงานนอกออฟฟิศ</h2>
          <span className="chip bg-grape-soft text-grape">ไม่ใช่การลา</span>
        </div>
        <WorkArrangementForm
          employeeId={employeeId}
          wfhTypeId={wfhTypeId}
          onsiteTypeId={onsiteTypeId}
          wfhRemaining={wfhRemaining}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl2 border border-sand p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">🏠 Work from home</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            เหลือ {wfhRemaining}
            <span className="text-base font-normal text-muted"> / {wfhQuota} ครั้ง</span>
          </div>
          <div className="h-2.5 rounded-full bg-sand overflow-hidden mt-2">
            <div className="h-full rounded-full bg-grape" style={{ width: `${Math.min(100, (wfhUsed / wfhQuota) * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mt-2">ใช้ไป {wfhUsed} ครั้งปีนี้</p>
        </div>

        <div className="rounded-xl2 border border-sand p-4">
          <span className="font-semibold text-base">🎬 ออกกอง / นอกสถานที่</span>
          <div className="mt-2 text-3xl font-extrabold">
            {onsiteUsed} <span className="text-base font-normal text-muted">ครั้งปีนี้</span>
          </div>
          <p className="text-sm text-muted mt-3">ไม่จำกัดจำนวน — แค่แจ้งให้ทีมรู้ว่าวันนั้นออกไปทำงานข้างนอก</p>
        </div>
      </div>
    </Card>
  );
}
