import { createClient } from "@/lib/supabase/server";
import { getEmploymentTypes, getRoles } from "@/lib/reference";

/** Load all dropdown option lists used by the employee form. */
export async function loadEmployeeFormOptions(excludeEmployeeId?: string) {
  const supabase = await createClient();
  // employment types + roles are cached reference data; depts/teams/managers are live
  const [empTypesAll, rolesAll, { data: departments }, { data: teams }, { data: managers }] = await Promise.all([
    getEmploymentTypes(),
    getRoles(),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("employees").select("id, first_name, nickname").order("first_name"),
  ]);

  return {
    employmentTypes: empTypesAll.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, key: t.key })),
    departments: departments ?? [],
    teams: teams ?? [],
    // Small-company set for now: owner / employee / intern only.
    // (hr_admin, manager, finance roles still exist — add their keys here when the company grows.)
    roles: rolesAll
      .filter((r) => ["owner", "employee", "intern"].includes(r.key))
      .map((r) => ({ id: r.id, name: r.name, key: r.key })),
    managers: (managers ?? [])
      .filter((m) => m.id !== excludeEmployeeId)
      .map((m) => ({ id: m.id, name: m.nickname || m.first_name })),
  };
}
