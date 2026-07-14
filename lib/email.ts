// อีเมลกลาง — ห่อ header (โลโก้น้องอ๋อย) + footer + ส่งผ่าน Resend
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com";
const LOGO = `${SITE}/brand/logo.png`;

export function emailShell(inner: string): string {
  return `<div style="font-family:'Segoe UI',sans-serif;line-height:1.8;color:#1a1a1a;max-width:540px;margin:0 auto;padding:8px">
    <div style="text-align:center;padding:6px 0 18px">
      <img src="${LOGO}" alt="YuenDeaw" width="76" height="76" style="border-radius:18px;display:inline-block"/>
    </div>
    ${inner}
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0 12px"/>
    <p style="font-size:12px;color:#999;text-align:center;margin:0">
      บริษัท ยืนเดี่ยว จำกัด · YuenDeaw People<br/>
      <a href="${SITE}" style="color:#8A6800;text-decoration:none">people.yuendeaw.com</a>
    </p>
  </div>`;
}

// ปุ่มลิงก์ (เหลืองแบรนด์ = primary, เทา = secondary)
export function emailButton(href: string, label: string, primary = false): string {
  const bg = primary ? "#F7BE00" : "#eee";
  const color = primary ? "#1a1a1a" : "#333";
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${color};padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;margin:4px 6px 4px 0">${label}</a>`;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string | string[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return false;
  const to = Array.isArray(opts.to) ? [...new Set(opts.to.filter(Boolean))] : opts.to;
  if (!to || (Array.isArray(to) && to.length === 0)) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// แถวตารางข้อมูล
export function emailRow(label: string, value: string): string {
  return `<tr><td style="padding:5px 16px 5px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td><td><b>${value}</b></td></tr>`;
}
