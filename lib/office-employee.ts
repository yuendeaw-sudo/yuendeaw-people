import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentStaff } from "./office-policy";

export type OfficeIdentity = { userId: string; employeeId: string; email: string; name: string; isOwner: boolean };

export async function employeeForUser(user: { id: string; email?: string; email_confirmed_at?: string }): Promise<OfficeIdentity | null> {
  if (!user.email || !user.email_confirmed_at) return null;
  const admin = createAdminClient();
  const [{ data: employee, error }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("employees").select("id,user_id,status,first_name,nickname,employment_types(key)").eq("user_id", user.id).maybeSingle(),
    admin.from("app_users").select("is_owner").eq("id", user.id).maybeSingle(),
  ]);
  if (error || profileError) throw new Error("Employee directory unavailable");
  const row = employee as unknown as { id: string; user_id: string; status: string; first_name: string; nickname: string | null; employment_types: { key: string } | null } | null;
  if (!isCurrentStaff(row, user.id)) return null;
  return { userId: user.id, employeeId: row!.id, email: user.email, name: row!.nickname || row!.first_name, isOwner: profile?.is_owner === true };
}

export async function employeeForToken(token: string, expectedClientId: string): Promise<OfficeIdentity | null> {
  if (!token || token.length > 8192 || !expectedClientId) return null;
  const { data: { user }, error } = await createAdminClient().auth.getUser(token);
  if (error || !user) return null;
  // Claims are inspected only AFTER the Auth server has verified this exact token.
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  if (claims.client_id !== expectedClientId || claims.sub !== user.id || claims.exp * 1000 <= Date.now()) return null;
  return employeeForUser(user);
}
