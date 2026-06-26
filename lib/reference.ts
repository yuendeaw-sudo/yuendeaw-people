import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reference / config tables that almost never change and are the SAME for every
 * user (no UI adds or removes them). Cached across requests so they don't hit the
 * DB on every page load. Uses the admin client (no per-user state → safe to cache
 * globally). revalidate keeps them fresh if edited directly in the DB.
 */

export const getEmploymentTypes = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("employment_types")
      .select("id, name, key, color, is_active, sort_order")
      .order("sort_order");
    return data ?? [];
  },
  ["ref:employment_types"],
  { revalidate: 600, tags: ["reference"] }
);

export const getLeaveTypes = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("leave_types")
      .select("id, name, key, color, is_paid, is_active, requires_evidence, sort_order")
      .order("sort_order");
    return data ?? [];
  },
  ["ref:leave_types"],
  { revalidate: 600, tags: ["reference"] }
);

export const getRoles = unstable_cache(
  async () => {
    const { data } = await createAdminClient().from("roles").select("id, key, name, description").order("name");
    return data ?? [];
  },
  ["ref:roles"],
  { revalidate: 600, tags: ["reference"] }
);
