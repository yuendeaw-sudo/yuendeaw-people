import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";

// การ์ด "วันหยุดสะสมจากการทุ่มเท" — owner เป็นคนให้ พนักงานเห็นยอด + ที่มา
export async function CompDayOffCard({ employeeId }: { employeeId: string }) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("comp_day_off")
    .select("id, days, hours, work_date, note, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  const grants = rows ?? [];
  if (grants.length === 0) return null; // ยังไม่เคยได้รับ → ไม่ต้องรก

  const total = grants.reduce((s: number, g: any) => s + Number(g.days || 0), 0);

  return (
    <Card className="border-mint/40 bg-mint-soft/30">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Palmtree" className="size-5 text-mint" />
        <h2 className="font-semibold text-base">วันหยุดสะสมจากการทุ่มเท</h2>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-4xl font-extrabold text-mint">{total % 1 === 0 ? total : total.toFixed(1)}</div>
        <div className="text-base text-muted mb-1">วัน</div>
      </div>
      <p className="text-sm text-muted mt-1">
        เจ้าของให้ไว้เป็นน้ำใจตอบแทนวันที่ทุ่มเทเกินหน้าที่ 💚 อยากใช้เมื่อไรคุยกับหัวหน้า/HR ได้เลย
      </p>

      <div className="mt-4 space-y-2">
        {grants.map((g: any) => (
          <div key={g.id} className="flex items-center gap-3 text-sm border-t border-mint/20 pt-2">
            <Icon name="Gift" className="size-4 text-mint shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                +{g.days % 1 === 0 ? g.days : Number(g.days).toFixed(1)} วัน
                {g.work_date ? <span className="text-muted font-normal"> · จากงานวันที่ {formatThaiDate(g.work_date)}</span> : ""}
              </div>
              {g.note && <div className="text-xs text-muted italic">“{g.note}”</div>}
            </div>
            {g.hours ? <span className="text-[11px] text-muted">{Number(g.hours)} ชม.</span> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
