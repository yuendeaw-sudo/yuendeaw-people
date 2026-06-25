import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com";

// HR/owner sends an invite to a pre-created employee. With Google SSO the invite
// is informational: the person just logs in with Google using this email and
// 0007 auto-links them. We record invited_at and (if Resend is set) email them.
export async function POST(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!ctx.isOwner && !can(ctx, "people", "edit")) return new Response("forbidden", { status: 403 });

  const { employeeId } = await req.json().catch(() => ({}));
  if (!employeeId) return new Response("employeeId required", { status: 400 });

  const admin = createAdminClient();
  const { data: emp } = await admin
    .from("employees")
    .select("id, first_name, nickname, email, user_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (!emp) return new Response("not found", { status: 404 });
  if (!emp.email) return Response.json({ ok: false, reason: "no_email" }, { status: 400 });

  await admin.from("employees").update({ invited_at: new Date().toISOString() }).eq("id", employeeId);

  const name = emp.nickname || emp.first_name || "";
  const inviteText =
    `สวัสดีค่ะ ${name} 🎉\n` +
    `คุณได้รับเชิญเข้าใช้งาน YuenDeaw People OS\n\n` +
    `1. เข้า ${SITE}\n` +
    `2. กด "เข้าสู่ระบบด้วย Google"\n` +
    `3. เลือกบัญชี Google ของอีเมล: ${emp.email}\n\n` +
    `แล้วเจอกันในระบบนะคะ 💛`;

  let emailed = false;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (key && from && !emp.user_id) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: emp.email,
          subject: "คุณได้รับเชิญเข้าใช้งาน YuenDeaw People OS 💛",
          html: `<div style="font-family:sans-serif;line-height:1.7;color:#1a1a1a">
            <h2>สวัสดี ${name} 🎉</h2>
            <p>คุณได้รับเชิญเข้าใช้งาน <b>YuenDeaw People OS</b></p>
            <ol>
              <li>เข้า <a href="${SITE}">${SITE}</a></li>
              <li>กด <b>"เข้าสู่ระบบด้วย Google"</b></li>
              <li>เลือกบัญชี Google ของอีเมล <b>${emp.email}</b></li>
            </ol>
            <p style="margin-top:24px">
              <a href="${SITE}" style="background:#F7BE00;color:#1a1a1a;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">เข้าสู่ระบบ</a>
            </p>
            <p style="color:#888;font-size:13px;margin-top:24px">แล้วเจอกันในระบบนะ 💛 — ทีม People, ยืนเดี่ยว</p>
          </div>`,
        }),
      });
      emailed = r.ok;
    } catch {
      emailed = false;
    }
  }

  return Response.json({ ok: true, emailed, alreadyJoined: !!emp.user_id, inviteText, email: emp.email });
}
