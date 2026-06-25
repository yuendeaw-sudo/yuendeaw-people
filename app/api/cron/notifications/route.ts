import { getAccessContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatThaiDate } from "@/lib/utils";

export const runtime = "nodejs";

const DAYS_AHEAD = 7;

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
    return url.searchParams.get("secret") === secret || bearer === secret;
  }
  // no secret configured → allow an authenticated owner to trigger manually
  const ctx = await getAccessContext();
  return !!ctx?.isOwner;
}

// optional email digest via Resend (no-op unless configured)
async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch {
    /* best-effort */
  }
}

export async function GET(req: Request) {
  if (!(await authorize(req))) return new Response("forbidden", { status: 403 });

  const admin = createAdminClient();
  const today = new Date();
  const until = new Date(today.getTime() + DAYS_AHEAD * 86400000);

  const [{ data: owners }, { data: probation }, { data: subs }] = await Promise.all([
    admin.from("app_users").select("id, email").eq("is_owner", true),
    admin
      .from("employees")
      .select("id, first_name, nickname, probation_end_date")
      .gte("probation_end_date", ymd(today))
      .lte("probation_end_date", ymd(until))
      .in("status", ["active", "probation"]),
    admin
      .from("subscriptions")
      .select("id, service_name, renewal_date")
      .gte("renewal_date", ymd(today))
      .lte("renewal_date", ymd(until))
      .neq("status", "cancelled"),
  ]);

  const ownerList = owners ?? [];
  type N = { user_id: string; title: string; body: string; link: string; kind: string };
  const candidates: N[] = [];

  for (const e of probation ?? []) {
    const name = (e as any).nickname || (e as any).first_name;
    for (const o of ownerList)
      candidates.push({
        user_id: o.id,
        title: `ทดลองงานใกล้ครบ: ${name}`,
        body: `ครบกำหนด ${formatThaiDate((e as any).probation_end_date)}`,
        link: `/people/${(e as any).id}`,
        kind: "probation",
      });
  }
  for (const s of subs ?? []) {
    for (const o of ownerList)
      candidates.push({
        user_id: o.id,
        title: `Subscription ใกล้ต่ออายุ: ${(s as any).service_name}`,
        body: `ต่ออายุ ${formatThaiDate((s as any).renewal_date)}`,
        link: `/subscriptions`,
        kind: "subscription",
      });
  }

  if (!candidates.length) return Response.json({ created: 0 });

  // dedup against notifications created in the last 30 days with the same user+link+kind
  const since = new Date(today.getTime() - 30 * 86400000).toISOString();
  const links = Array.from(new Set(candidates.map((c) => c.link)));
  const { data: existing } = await admin
    .from("notifications")
    .select("user_id, link, kind")
    .in("link", links)
    .gte("created_at", since);
  const seen = new Set((existing ?? []).map((x: any) => `${x.user_id}|${x.link}|${x.kind}`));
  const fresh = candidates.filter((c) => !seen.has(`${c.user_id}|${c.link}|${c.kind}`));

  if (fresh.length) {
    await admin.from("notifications").insert(fresh);

    // email digest per owner (only if Resend configured)
    for (const o of ownerList) {
      if (!o.email) continue;
      const mine = fresh.filter((f) => f.user_id === o.id);
      if (!mine.length) continue;
      const html = `<h3>YuenDeaw People OS — แจ้งเตือน</h3><ul>${mine
        .map((m) => `<li><b>${m.title}</b><br/>${m.body}</li>`)
        .join("")}</ul>`;
      await sendEmail(o.email, `มี ${mine.length} เรื่องต้องดู — YuenDeaw People OS`, html);
    }
  }

  return Response.json({ created: fresh.length, scanned: candidates.length });
}
