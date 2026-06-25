import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function ComingSoon({
  title,
  icon,
  phase,
  features,
}: {
  title: string;
  icon: string;
  phase: string;
  features: string[];
}) {
  return (
    <div>
      <PageHeader title={title} icon={icon} subtitle="กำลังพัฒนา — ออกแบบฐานข้อมูลรองรับแล้ว" />
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Badge tone="grape">{phase}</Badge>
          <span className="text-sm text-muted">โครงสร้างข้อมูลพร้อมแล้ว เหลือส่วนหน้าจอ</span>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm rounded-xl bg-sand/40 px-3 py-2.5">
              <Icon name="Check" className="size-4 text-mint shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
