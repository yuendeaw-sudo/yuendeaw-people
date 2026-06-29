import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatCard, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PLATFORMS, platformOf } from "@/lib/social";
import { SocialAccountForm } from "@/components/social/SocialAccountForm";

export default async function SocialPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "subscriptions", "view") && !can(ctx, "finance", "view")) redirect("/dashboard");
  const supabase = await createClient();
  const canEdit = can(ctx, "subscriptions", "edit");

  const [{ data: rows }, { data: emps }, { data: accts }] = await Promise.all([
    supabase
      .from("social_accounts")
      .select("*, owner:owner_id(first_name, nickname), subscription_accounts(label, email)")
      .order("name"),
    supabase.from("employees").select("id, first_name, nickname, status").order("first_name"),
    supabase.from("subscription_accounts").select("id, label, email").order("label"),
  ]);

  const employees = (emps ?? [])
    .filter((e: any) => !["alumni", "inactive"].includes(e.status))
    .map((e: any) => ({ id: e.id, name: e.nickname || e.first_name }));
  const nameOf = new Map(employees.map((e) => [e.id, e.name]));
  const accounts = (accts ?? []).map((a: any) => ({ id: a.id, label: a.label, email: a.email }));
  const list = rows ?? [];

  const noTwofa = list.filter((s) => !s.twofa_status || /ยังไม่|ไม่ได้|no|off/i.test(s.twofa_status)).length;
  const platformsUsed = new Set(list.map((s) => s.platform)).size;

  // group by platform (ตามลำดับใน PLATFORMS)
  const groups = PLATFORMS.map((p) => ({
    ...p,
    items: list.filter((s) => s.platform === p.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="บัญชีโซเชียล / แบรนด์"
        icon="Share2"
        subtitle="ทะเบียนบัญชีโซเชียลของออฟฟิศ — ใครดูแล ใครมีสิทธิ์ 2FA และการกู้คืน"
        action={canEdit ? <SocialAccountForm employees={employees} accounts={accounts} /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="บัญชีทั้งหมด" value={list.length} icon="Share2" tone="brand" />
        <StatCard label="แพลตฟอร์ม" value={platformsUsed} icon="LayoutGrid" tone="grape" />
        <StatCard label="ยังไม่ยืนยัน 2FA" value={noTwofa} icon="ShieldAlert" tone={noTwofa > 0 ? "rose" : "mint"} />
      </div>

      {list.length ? (
        <div className="space-y-5">
          {groups.map((g) => (
            <Card key={g.key}>
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                <span>{g.emoji}</span> {g.label}
                <span className="text-xs font-normal text-muted">({g.items.length})</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {g.items.map((s) => {
                  const owner = (s as any).owner;
                  const acct = (s as any).subscription_accounts;
                  const admins = (Array.isArray(s.admin_ids) ? s.admin_ids : [])
                    .map((id: string) => nameOf.get(id))
                    .filter(Boolean);
                  const twofaOk = s.twofa_status && !/ยังไม่|ไม่ได้|no|off/i.test(s.twofa_status);
                  return (
                    <div key={s.id} className="rounded-xl2 border border-sand p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{s.name}</div>
                          {(s.handle || s.url) && (
                            <a
                              href={s.url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gold hover:underline break-all"
                            >
                              {s.handle || s.url}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.status === "inactive" && <Badge tone="sand">พักไว้</Badge>}
                          {canEdit && <SocialAccountForm existing={s} employees={employees} accounts={accounts} />}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-sm">
                        <Line icon="UserCog" label="ผู้ดูแล" value={owner?.nickname || owner?.first_name || "—"} />
                        <div className="flex gap-2 text-muted">
                          <Icon name="Users" className="size-4 shrink-0 mt-0.5 text-muted" />
                          <span className="text-ink">
                            สิทธิ์ admin:{" "}
                            {admins.length ? admins.join(", ") : <span className="text-muted">ยังไม่ระบุ</span>}
                          </span>
                        </div>
                        <Line
                          icon="KeyRound"
                          label="ล็อกอิน"
                          value={acct?.email || acct?.label || s.login_email || "—"}
                        />
                        <div className="flex gap-2">
                          <Icon name={twofaOk ? "ShieldCheck" : "ShieldAlert"} className={`size-4 shrink-0 mt-0.5 ${twofaOk ? "text-mint" : "text-rose"}`} />
                          <span className={twofaOk ? "text-ink" : "text-rose"}>
                            2FA: {s.twofa_status || "ยังไม่ยืนยัน"}
                          </span>
                        </div>
                        {(s.recovery_email || s.recovery_phone) && (
                          <Line icon="LifeBuoy" label="กู้คืน" value={[s.recovery_email, s.recovery_phone].filter(Boolean).join(" · ")} />
                        )}
                        {s.followers && <Line icon="TrendingUp" label="ผู้ติดตาม" value={s.followers} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="Share2"
          title="ยังไม่มีบัญชีโซเชียล"
          subtitle="เพิ่มเพจ/บัญชีของแบรนด์เพื่อคุมสิทธิ์เข้าถึงและ 2FA ให้ปลอดภัย"
        />
      )}
    </div>
  );
}

function Line({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-2 text-muted">
      <Icon name={icon} className="size-4 shrink-0 mt-0.5" />
      <span className="text-ink">
        {label}: {value}
      </span>
    </div>
  );
}
