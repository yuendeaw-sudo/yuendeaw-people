import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, Avatar, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { AssetForm } from "@/components/assets/AssetForm";

const TYPE_ICON: Record<string, string> = {
  laptop: "Laptop", camera: "Camera", lens: "Aperture", microphone: "Mic",
  monitor: "Monitor", keycard: "CreditCard", software: "AppWindow", storage: "HardDrive",
};

export default async function AssetsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "assets", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "assets", "edit");

  const [{ data: assets }, { data: emps }] = await Promise.all([
    supabase.from("company_assets").select("*, assignee:assigned_to(first_name, nickname)").order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  const employees = (emps ?? []).map((e) => ({ id: e.id, name: e.nickname || e.first_name }));
  const list = assets ?? [];
  const assigned = list.filter((a) => a.assigned_to && !a.return_date).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ทรัพย์สินบริษัท"
        icon="Boxes"
        subtitle="ทะเบียนอุปกรณ์ และการมอบหมายให้พนักงาน"
        action={canEdit ? <AssetForm employees={employees} /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="ทรัพย์สินทั้งหมด" value={list.length} icon="Boxes" tone="brand" />
        <StatCard label="กำลังถูกใช้งาน" value={assigned} icon="UserCheck" tone="mint" />
        <StatCard label="ว่าง / คืนแล้ว" value={list.length - assigned} icon="PackageOpen" tone="sand" />
      </div>

      {list.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((a) => {
            const who = (a as any).assignee;
            const returned = !!a.return_date;
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center size-11 rounded-xl bg-brand-soft text-gold shrink-0">
                    <Icon name={TYPE_ICON[a.asset_type] ?? "Box"} className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold truncate">{a.name}</div>
                      {canEdit && <AssetForm existing={a} employees={employees} />}
                    </div>
                    <div className="text-xs text-muted">{a.asset_type}{a.serial_number && ` · ${a.serial_number}`}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {who && !returned ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <Avatar name={who.nickname || who.first_name} size={20} />
                          {who.nickname || who.first_name}
                        </span>
                      ) : returned ? (
                        <Badge tone="sand">คืนแล้ว {formatThaiDate(a.return_date)}</Badge>
                      ) : (
                        <Badge tone="mint">ว่าง</Badge>
                      )}
                      {a.condition && <Badge tone="sand">{a.condition}</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="Boxes" title="ยังไม่มีทรัพย์สิน" subtitle="เพิ่ม laptop, กล้อง, keycard ฯลฯ เพื่อติดตามการมอบหมาย" />
      )}
    </div>
  );
}
