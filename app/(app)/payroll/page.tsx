import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, EmptyState, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB } from "@/lib/utils";
import { computePayroll } from "@/lib/payroll";

const TH_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export default async function PayrollPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "sensitive_view") && !can(ctx, "finance", "view")) redirect("/dashboard");
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { rows, total } = await computePayroll(supabase, year, month);

  const paying = rows.filter((r) => r.net > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        icon="Wallet"
        subtitle={`สรุปค่าตอบแทนเดือน ${TH_MONTHS[month - 1]} ${year + 543}`}
        action={
          <a href={`/api/payroll/export?year=${year}&month=${month}`} className="btn-brand">
            <Icon name="Download" className="size-4" /> ดาวน์โหลด CSV
          </a>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="ค่าจ้างรวมประมาณ" value={formatTHB(total)} icon="Wallet" tone="brand" />
        <StatCard label="คนที่มีค่าตอบแทน" value={paying} icon="Users" tone="mint" />
        <StatCard label="พนักงานทั้งหมด" value={rows.length} icon="IdCard" tone="sand" />
      </div>

      {rows.length ? (
        <Card>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-2 py-2 font-medium">พนักงาน</th>
                  <th className="px-2 py-2 font-medium">ประเภท</th>
                  <th className="px-2 py-2 font-medium text-right">เงินเดือน/เบี้ย</th>
                  <th className="px-2 py-2 font-medium text-right">OT</th>
                  <th className="px-2 py-2 font-medium text-right">โบนัส</th>
                  <th className="px-2 py-2 font-medium text-right">สวัสดิการ</th>
                  <th className="px-2 py-2 font-medium text-right">ประกันสังคม</th>
                  <th className="px-2 py-2 font-medium text-right">หัก ณ ที่จ่าย</th>
                  <th className="px-2 py-2 font-medium text-right">สุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sb = statusBadge(r.status);
                  return (
                    <tr key={r.employeeId} className="border-t border-sand/70">
                      <td className="px-2 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.code && <span className="text-xs text-muted">{r.code}</span>}
                          <Badge tone={sb.tone}>{sb.label}</Badge>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted">{r.type ?? "—"}</td>
                      <td className="px-2 py-3 text-right">{r.pay ? formatTHB(r.pay) : "—"}</td>
                      <td className="px-2 py-3 text-right">{r.ot ? <span className="text-mint">+{formatTHB(r.ot)}</span> : "—"}</td>
                      <td className="px-2 py-3 text-right">{r.bonus ? formatTHB(r.bonus) : "—"}</td>
                      <td className="px-2 py-3 text-right">{r.welfare ? formatTHB(r.welfare) : "—"}</td>
                      <td className="px-2 py-3 text-right">
                        {r.sso ? <span className="text-rose">−{formatTHB(r.sso)}</span> : "—"}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {r.wht ? <span className="text-rose">−{formatTHB(r.wht)}</span> : "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold">{formatTHB(r.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sand">
                  <td colSpan={8} className="px-2 py-3 font-semibold text-right">รวมจ่ายสุทธิ</td>
                  <td className="px-2 py-3 text-right font-extrabold text-base">{formatTHB(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted mt-3">
            <Icon name="Info" className="size-3.5 inline" /> เงินเดือน/เบี้ย = เงินเดือนล่าสุด + เบี้ยฝึก (เด็กฝึกมีแค่เบี้ย) · OT = เบิกที่อนุมัติแล้วในเดือนนั้น · หักประกันสังคม 5% (ฐาน 1,650–17,500) สำหรับผู้มีสิทธิ์ · หัก ณ ที่จ่าย 3% สำหรับคนไม่มีประกันสังคมและเด็กฝึก — เป็นยอดประมาณการ ตรวจกับฝ่ายการเงินก่อนจ่ายจริง
          </p>
        </Card>
      ) : (
        <EmptyState icon="Wallet" title="ยังไม่มีข้อมูลค่าตอบแทน" subtitle="เพิ่มเงินเดือนในแฟ้มพนักงานก่อน" />
      )}
    </div>
  );
}
