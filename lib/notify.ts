"use client";

import { createClient } from "@/lib/supabase/client";

export type NotifPayload = { title: string; body?: string | null; link?: string | null; kind?: string };

/**
 * Create an in-app notification for an employee (resolves their app_user id).
 * Best-effort — never throws, so it can't break the triggering action.
 * Works when the caller can read the target employee (RLS): approvers/HR/owner.
 */
export async function notifyEmployee(employeeId: string, n: NotifPayload) {
  try {
    const sb = createClient();
    const { data } = await sb.from("employees").select("user_id").eq("id", employeeId).maybeSingle();
    if (data?.user_id) {
      await sb.from("notifications").insert({
        user_id: data.user_id,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        kind: n.kind ?? "info",
      });
    }
  } catch {
    /* swallow — notifications must not break the request */
  }
}
