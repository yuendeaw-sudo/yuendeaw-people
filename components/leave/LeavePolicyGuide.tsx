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
  const { data: policies, error } = await supabase
    .from("leave_policies")
    .select("annual_quota_days, rules, leave_types(key), employment_types(key)")
    .order("created_at");

  if (error) return <Card><p role="alert" className="text-sm text-rose">ไม่สามารถโหลดข้อมูลสิทธิการลาได้ กรุณาลองใหม่หรือติดต่อ HR</p></Card>;
  const byKey = (k: string) =>
    (policies ?? []).find((p: any) => p.leave_types?.key === k && p.employment_types?.key === "full_time") ??
    (policies ?? []).find((p: any) => p.leave_types?.key === k && !p.employment_types);
  const tiers: { years: number; days: number }[] = byKey("annual")?.rules?.tiers ?? [{ years: 1, days: 6 }];
  const lwopMax = byKey("unpaid")?.rules?.max_days ?? 90;

  return (
    <Card>
      <details className="group">
        <summary className="cursor-pointer flex items-center gap-2 font-semibold text-base">
          <Icon name="HeartHandshake" className="size-5 text-gold" />
          สิทธิและกติกาการลาของ YuenDeaw
          <span className="chip bg-mint-soft text-mint ml-1">ข้อมูลสำหรับวางแผน</span>
          <Icon name="ChevronDown" className="size-5 text-muted ml-auto transition group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          {/* core rules */}
          <div className="rounded-xl2 bg-sand/40 p-4">
            <div className="font-semibold mb-2 flex items-center gap-1.5">
              <Icon name="CircleCheck" className="size-4 text-mint" /> กติกาหลัก
            </div>
            <ul className="space-y-1.5 text-ink/85">
              <li>• พักร้อนและลากิจที่วางแผนได้ ให้ <b>ส่งคำขอในระบบและประสานหัวหน้าล่วงหน้า</b> เพื่อจัดการส่งต่องาน</li>
              <li>• เหตุป่วยหรือฉุกเฉิน แจ้งหัวหน้าโดยเร็ว แล้วบันทึกในระบบย้อนหลังได้</li>
              <li>• ลาครึ่งวัน นับเป็น <b>0.5 วัน</b></li>
            </ul>
          </div>

          {/* per-type */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลาป่วย</div>
              <p className="text-muted mt-1">ป่วยจริงลาได้ แจ้งหัวหน้า · ลาตั้งแต่ 3 วันทำงานขึ้นไป บริษัทอาจขอใบรับรองแพทย์ หากแสดงไม่ได้ให้ชี้แจงเหตุผล</p>
            </div>
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลากิจ</div>
              <p className="text-muted mt-1">กิจธุระจำเป็น ได้รับค่าจ้าง 3 วันทำงาน/ปี รวมช่วงทดลองงาน · แจ้งล่วงหน้าเมื่อทำได้</p>
            </div>
            <div className="rounded-xl border border-sand p-3">
              <div className="font-semibold">ลาพักร้อน</div>
              <p className="text-muted mt-1">เริ่มมีสิทธิ์เมื่ออยู่ครบ 1 ปี · สิทธิตามอายุงาน</p>
            </div>
          </div>

          {/* annual tenure table */}
          <div className="rounded-xl2 border border-sand p-4">
            <div className="font-semibold mb-2">ลาพักร้อนพนักงานประจำ — สิทธิตามอายุงาน</div>
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
              <Icon name="Hand" className="size-4 text-[#9a6b06]" /> การแจ้งเหตุและบันทึกการลา
            </div>
            <ul className="space-y-1 text-ink/85">
              <li>• หากไม่สามารถมาทำงานได้ ให้แจ้งหัวหน้าหรือ HR เพื่อบันทึกเหตุและจัดการงานแทน</li>
              <li>• กรณีขาดงาน HR จะตรวจสอบข้อเท็จจริงและดำเนินการตามระเบียบบริษัทและกฎหมาย</li>
              <li>• ป่วย/ฉุกเฉินกะทันหัน ทักหาหัวหน้าก่อน แล้วค่อยบันทึกในระบบย้อนหลังได้</li>
            </ul>
          </div>

          <p className="text-xs text-muted pt-1">
            <Icon name="Sparkles" className="size-3 inline text-gold" /> ข้อมูลสิทธิพักร้อนอ้างอิงนโยบายที่ตั้งไว้ในระบบ หากข้อมูลอายุงานหรือสิทธิไม่ตรง ติดต่อ HR เพื่อตรวจสอบ
          </p>
        </div>
      </details>
    </Card>
  );
}
