import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * Leave rules — YuenDeaw's own friendly policy (secondary reference).
 * Structure is grounded in Thai labour-law minimums internally, but presented
 * as our flexible team rules. Annual tiers + LWOP cap come from leave_policies.
 */
export async function LeavePolicyGuide() {
  const supabase = await createClient();
  const { data: policies } = await supabase
    .from("leave_policies")
    .select("annual_quota_days, rules, leave_types(key)")
    .order("created_at");

  const byKey = (k: string) => (policies ?? []).find((p: any) => p.leave_types?.key === k);
  const tiers: { years: number; days: number }[] = byKey("annual")?.rules?.tiers ?? [{ years: 1, days: 6 }];
  const lwopMax = byKey("unpaid")?.rules?.max_days ?? 90;

  return (
    <Card>
      <details className="group">
        <summary className="cursor-pointer flex items-center gap-2 font-semibold text-base">
          <Icon name="HeartHandshake" className="size-5 text-gold" />
          กติกาการลาของชาว YuenDeaw
          <span className="chip bg-mint-soft text-mint ml-1">ยืดหยุ่น 🤝</span>
          <Icon name="ChevronDown" className="size-5 text-muted ml-auto transition group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          {/* core rules */}
          <div className="rounded-xl2 bg-sand/40 p-4">
            <div className="font-semibold mb-2 flex items-center gap-1.5">
              <Icon name="CircleCheck" className="size-4 text-mint" /> กติกาหลัก
            </div>
            <ul className="space-y-1.5 text-ink/85">
              <li>• ลาทุกครั้งต้อง <b>กดขอในระบบ</b> และ <b>ได้รับอนุมัติจากหัวหน้าก่อน</b> ถึงจะนับเป็นวันลา</li>
              <li>• ลาที่ยังไม่อนุมัติ <b>ยังไม่ถูกนับ</b> — รออนุมัติให้เรียบร้อย</li>
              <li>• ลาครึ่งวัน นับเป็น <b>0.5 วัน</b></li>
            </ul>
          </div>

          {/* per-type */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลาป่วย</div>
              <p className="text-muted mt-1">ป่วยจริงลาได้ แจ้งหัวหน้า · ลายาว 3 วันขึ้นไป แนบใบรับรองแพทย์</p>
            </div>
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลากิจ</div>
              <p className="text-muted mt-1">มีธุระจำเป็น 3 วัน/ปี · แจ้งหัวหน้าล่วงหน้า</p>
            </div>
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลาพักร้อน 🌴</div>
              <p className="text-muted mt-1">เริ่มมีสิทธิ์เมื่ออยู่ครบ 1 ปี · ยิ่งอยู่นานยิ่งได้เพิ่ม</p>
            </div>
          </div>

          {/* annual tenure table */}
          <div className="rounded-xl2 border border-sand p-4">
            <div className="font-semibold mb-2">ลาพักร้อน — ยิ่งอยู่นานยิ่งได้เพิ่ม</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tiers.map((t) => (
                <div key={t.years} className="rounded-xl bg-sand/50 p-3 text-center">
                  <div className="text-xs text-muted">ครบ {t.years} ปี</div>
                  <div className="text-xl font-extrabold mt-0.5">{t.days} วัน</div>
                </div>
              ))}
            </div>
          </div>

          {/* LWOP */}
          <div className="rounded-xl2 border border-grape-soft bg-grape-soft/30 p-4">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <Icon name="Plane" className="size-4 text-grape" /> ลาแบบไม่รับเงินเดือน (Leave without pay)
            </div>
            <p className="text-ink/85">
              อยากพักยาวเพราะ burnout หรือไปเรียนต่อต่างประเทศ — ลาได้ <b>สูงสุด {lwopMax} วัน (≈3 เดือน)</b>{" "}
              ช่วงนั้นไม่รับเงินเดือน แต่ <b>ไม่ถือว่าลาออก</b> กลับมาทำงานต่อได้ คุยกับ HR ได้เลย
            </p>
          </div>

          {/* absence */}
          <div className="rounded-xl2 border border-amber-soft bg-amber-soft/40 p-4">
            <div className="font-semibold mb-1.5 flex items-center gap-1.5">
              <Icon name="Hand" className="size-4 text-[#9a6b06]" /> หายไปเฉย ๆ ไม่เวิร์กนะ 🙏
            </div>
            <ul className="space-y-1 text-ink/85">
              <li>• ขาดแบบไม่แจ้งใคร = วันนั้นไม่ได้ค่าจ้าง</li>
              <li>• หายเงียบติดกัน 3 วันโดยไม่มีเหตุผล = ถือว่าตั้งใจออกเอง</li>
              <li>• ป่วย/ฉุกเฉินกะทันหัน ทักหาหัวหน้าก่อน แล้วค่อยบันทึกในระบบย้อนหลังได้</li>
            </ul>
          </div>

          <p className="text-xs text-muted pt-1">
            <Icon name="Sparkles" className="size-3 inline text-gold" /> นโยบายปรับได้เสมอ — HR ตั้งค่าโควต้า/กติกาเองได้ที่หน้าตั้งค่าระบบ
          </p>
        </div>
      </details>
    </Card>
  );
}
