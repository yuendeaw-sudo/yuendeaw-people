import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Avatar, Badge, statusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { tenureLabel } from "@/lib/utils";

// แสดงเป็น section ตามรูปแบบการจ้างงาน: ประจำ → ฝึกงาน → ฟรีแลนซ์ → อื่น ๆ
const SECTIONS: { key: string; label: string; icon: string }[] = [
  { key: "full_time", label: "พนักงานประจำ", icon: "Users" },
  { key: "intern", label: "เด็กฝึกงาน", icon: "GraduationCap" },
  { key: "freelance", label: "ฟรีแลนซ์", icon: "Briefcase" },
];
const KNOWN = SECTIONS.map((s) => s.key);

// อยู่กับเรานานสุดขึ้นก่อน (start_date เก่าสุดก่อน), คนไม่มีวันเริ่มไว้ท้าย
function byTenure(a: any, b: any) {
  const as = a.start_date,
    bs = b.start_date;
  if (!as && !bs) return 0;
  if (!as) return 1;
  if (!bs) return -1;
  return as < bs ? -1 : as > bs ? 1 : 0;
}

export default async function PeoplePage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "view")) redirect("/dashboard");
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, first_name, last_name, nickname, avatar_url, position_title, status, start_date, employment_types(name, key, color), teams(name)"
    )
    .order("created_at", { ascending: false });

  const list = employees ?? [];
  const groupOf = (e: any) => {
    const k = e.employment_types?.key;
    return KNOWN.includes(k) ? k : "other";
  };

  const sections = [
    ...SECTIONS.map((s) => ({ ...s, people: list.filter((e) => groupOf(e) === s.key).sort(byTenure) })),
    { key: "other", label: "อื่น ๆ", icon: "User", people: list.filter((e) => groupOf(e) === "other").sort(byTenure) },
  ].filter((s) => s.people.length > 0);

  return (
    <div>
      <PageHeader
        title="บุคคลากร"
        icon="Users"
        subtitle={`${list.length} คนในระบบ`}
        action={
          can(ctx, "people", "create") ? (
            <Link href="/people/new" className="btn-brand">
              <Icon name="UserPlus" className="size-4" /> เพิ่มคน
            </Link>
          ) : undefined
        }
      />

      {list.length ? (
        <div className="space-y-7">
          {sections.map((sec) => (
            <section key={sec.key}>
              <h2 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
                <Icon name={sec.icon} className="size-4 text-gold" />
                {sec.label}
                <span className="text-muted/70 font-normal">({sec.people.length})</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sec.people.map((e: any) => {
                  const sb = statusBadge(e.status);
                  const et = e.employment_types;
                  const tn = tenureLabel(e.start_date);
                  return (
                    <Link key={e.id} href={`/people/${e.id}`}>
                      <div className="card p-4 hover:shadow-pop transition h-full">
                        <div className="flex items-start gap-3">
                          <Avatar name={e.nickname || e.first_name} src={e.avatar_url} size={48} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">
                              {e.first_name} {e.last_name}
                            </div>
                            <div className="text-xs text-muted truncate">
                              {e.position_title || e.teams?.name || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <Badge tone={sb.tone}>{sb.label}</Badge>
                              {et && <Badge tone="sand">{et.name}</Badge>}
                            </div>
                            {tn && (
                              <div className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
                                <Icon name="Clock" className="size-3" /> อยู่กับเรา {tn}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="Users"
          title="ยังไม่มีข้อมูลบุคคลากร"
          subtitle="เพิ่มคนแรกเข้าระบบ หรือแปลงผู้สมัครจากหน้าใบสมัคร"
        />
      )}
    </div>
  );
}
