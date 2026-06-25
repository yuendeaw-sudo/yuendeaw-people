import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Avatar, Badge, statusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default async function PeoplePage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "people", "view")) redirect("/dashboard");
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, nickname, avatar_url, position_title, status, employment_types(name, color), teams(name)")
    .order("created_at", { ascending: false });

  const list = employees ?? [];

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((e) => {
            const sb = statusBadge(e.status);
            const et = (e as any).employment_types;
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
                        {e.position_title || (e as any).teams?.name || "—"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge tone={sb.tone}>{sb.label}</Badge>
                        {et && <Badge tone="sand">{et.name}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
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
