import { createClient } from "@/lib/supabase/server";

/** Load all dropdown option lists used by the employee form. */
export async function loadEmployeeFormOptions(excludeEmployeeId?: string) {
  const supabase = await createClient();
  const [{ data: employmentTypes }, { data: departments }, { data: teams }, { data: roles }, { data: managers }] =
    await Promise.all([
      supabase.from("employment_types").select("id, name, key").eq("is_active", true).order("sort_order"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
      // Small-company set for now: owner / employee / intern only.
      // (hr_admin, manager, finance roles still exist — add their keys here when the company grows.)
      supabase.from("roles").select("id, name, key").in("key", ["owner", "employee", "intern"]).order("name"),
      supabase.from("employees").select("id, first_name, nickname").order("first_name"),
    ]);

  return {
    employmentTypes: (employmentTypes ?? []).map((t) => ({ id: t.id, name: t.name, key: t.key })),
    departments: departments ?? [],
    teams: teams ?? [],
    roles: roles ?? [],
    managers: (managers ?? [])
      .filter((m) => m.id !== excludeEmployeeId)
      .map((m) => ({ id: m.id, name: m.nickname || m.first_name })),
  };
}
