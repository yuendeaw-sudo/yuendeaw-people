import { cn, initials } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid place-items-center size-11 rounded-xl2 bg-brand-soft text-gold">
            <Icon name={icon} className="size-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: "bg-brand-soft text-gold",
  grape: "bg-grape-soft text-grape",
  mint: "bg-mint-soft text-mint",
  amber: "bg-amber-soft text-[#9a6b06]",
  rose: "bg-rose-soft text-rose",
  sand: "bg-sand text-muted",
};

export function Badge({
  children,
  tone = "sand",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES | string;
  className?: string;
}) {
  return <span className={cn("chip", TONES[tone] ?? TONES.sand, className)}>{children}</span>;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && (
          <div className={cn("grid place-items-center size-8 rounded-lg", TONES[tone])}>
            <Icon name={icon} className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className="rounded-full object-cover bg-sand"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-full bg-grape-soft text-grape font-semibold uppercase"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

export function EmptyState({
  icon = "Inbox",
  title,
  subtitle,
  action,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-sand text-muted mb-3">
        <Icon name={icon} className="size-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Map a status string to a tone + Thai label for chips. */
export function statusBadge(status: string) {
  const map: Record<string, { tone: string; label: string }> = {
    active: { tone: "mint", label: "ทำงานอยู่" },
    probation: { tone: "amber", label: "ทดลองงาน" },
    intern: { tone: "grape", label: "ฝึกงาน" },
    freelance: { tone: "sand", label: "ฟรีแลนซ์" },
    inactive: { tone: "sand", label: "ไม่ได้ทำงานแล้ว" },
    alumni: { tone: "sand", label: "ศิษย์เก่า" },
    candidate: { tone: "grape", label: "ผู้สมัคร" },
    pending: { tone: "amber", label: "รออนุมัติ" },
    awaiting_confirm: { tone: "amber", label: "รอคุณยืนยัน" },
    approved: { tone: "mint", label: "อนุมัติ" },
    rejected: { tone: "rose", label: "ไม่อนุมัติ" },
    cancelled: { tone: "sand", label: "ยกเลิก" },
  };
  return map[status] ?? { tone: "sand", label: status };
}
