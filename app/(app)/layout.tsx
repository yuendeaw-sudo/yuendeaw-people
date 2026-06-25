import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { visibleNav } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAccessContext();
  if (!ctx) redirect("/login");
  // Allowlist: only the owner or someone linked to an employee record gets in.
  // Anyone else (e.g. a Google login that isn't on the team) waits for an invite.
  if (!ctx.isOwner && !ctx.employeeId) redirect("/pending");

  const supabase = await createClient();
  const { data: appUser } = await supabase
    .from("app_users")
    .select("full_name, email")
    .eq("id", ctx.userId)
    .maybeSingle();

  let roleLabel = ctx.isOwner ? "เจ้าของ / Founder" : "พนักงาน";
  let name = appUser?.full_name || appUser?.email || ctx.email;

  if (ctx.employeeId) {
    const { data: emp } = await supabase
      .from("employees")
      .select("first_name, nickname, position_title, employment_types(name)")
      .eq("id", ctx.employeeId)
      .maybeSingle();
    if (emp) {
      name = emp.nickname || emp.first_name || name;
      const et = (emp as any).employment_types?.name;
      roleLabel = emp.position_title || et || roleLabel;
    }
  }

  const nav = visibleNav(ctx);

  return (
    <AppShell nav={nav} user={{ name, email: ctx.email, roleLabel }}>
      {children}
    </AppShell>
  );
}
