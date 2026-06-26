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

  // ctx already carries full_name (from getAccessContext) — no duplicate app_users query
  let roleLabel = ctx.isOwner ? "เจ้าของ / Founder" : "พนักงาน";
  let name = ctx.fullName || ctx.email;
  let isMentor = false;

  if (ctx.employeeId) {
    const supabase = await createClient();
    // employee display + "do I mentor any interns?" run together (one round-trip)
    const [{ data: emp }, { data: myInterns }] = await Promise.all([
      supabase
        .from("employees")
        .select("first_name, nickname, position_title, employment_types(name)")
        .eq("id", ctx.employeeId)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("id, employment_types!inner(key)")
        .eq("manager_id", ctx.employeeId)
        .eq("employment_types.key", "intern")
        .limit(1),
    ]);
    if (emp) {
      name = emp.nickname || emp.first_name || name;
      const et = (emp as any).employment_types?.name;
      roleLabel = emp.position_title || et || roleLabel;
    }
    isMentor = (myInterns?.length ?? 0) > 0;
  }

  const nav = visibleNav(ctx, { isMentor });

  return (
    <AppShell nav={nav} user={{ name, email: ctx.email, roleLabel }}>
      {children}
    </AppShell>
  );
}
