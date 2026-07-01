import crypto from "crypto";

// Google Calendar + Meet ผ่าน Service Account (domain-wide delegation)
// env: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_CALENDAR_IMPERSONATE
export function googleCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_IMPERSONATE);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// แลก JWT (เซ็นด้วย service-account key, impersonate Workspace user) → access token
async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SA_EMAIL;
  const sub = process.env.GOOGLE_CALENDAR_IMPERSONATE;
  let pk = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !sub || !pk) return null;
  pk = pk.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      sub, // impersonate user (เจ้าของปฏิทินที่ event จะไปอยู่)
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signingInput);
    signature = b64url(signer.sign(pk));
  } catch {
    return null;
  }
  const jwt = `${signingInput}.${signature}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.access_token ?? null;
  } catch {
    return null;
  }
}

// ตรวจสอบการตั้งค่า: ลองขอ access token (จะ fail ถ้า delegation/scope/คีย์ไม่ถูก) — ไม่สร้าง event จริง
export async function diagnose(): Promise<{ configured: boolean; tokenOk: boolean; error?: string }> {
  if (!googleCalendarConfigured()) return { configured: false, tokenOk: false, error: "ยังไม่ได้ตั้ง env (GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY / GOOGLE_CALENDAR_IMPERSONATE)" };
  const email = process.env.GOOGLE_SA_EMAIL!;
  const sub = process.env.GOOGLE_CALENDAR_IMPERSONATE!;
  let pk = process.env.GOOGLE_SA_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/calendar.events", aud: "https://oauth2.googleapis.com/token", sub, iat: now, exp: now + 3600 }));
  const signingInput = `${header}.${claims}`;
  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signingInput);
    signature = b64url(signer.sign(pk));
  } catch (e: any) {
    return { configured: true, tokenOk: false, error: `เซ็น JWT ไม่ได้ (private key ผิดรูปแบบ?): ${e?.message || e}` };
  }
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${signature}` }),
    });
    const txt = await res.text();
    if (!res.ok) return { configured: true, tokenOk: false, error: `Google token ${res.status}: ${txt.slice(0, 300)}` };
    return { configured: true, tokenOk: true };
  } catch (e: any) {
    return { configured: true, tokenOk: false, error: `เรียก token endpoint ไม่ได้: ${e?.message || e}` };
  }
}

export async function createInterviewEvent(opts: {
  summary: string;
  description: string;
  startISO: string; // "2026-07-01T10:00:00"
  endISO: string;
  attendees: string[];
  timeZone?: string;
}): Promise<{ meetUrl: string | null; htmlLink: string | null; eventId: string | null } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const body = {
    summary: opts.summary,
    description: opts.description,
    start: { dateTime: opts.startISO, timeZone: opts.timeZone || "Asia/Bangkok" },
    end: { dateTime: opts.endISO, timeZone: opts.timeZone || "Asia/Bangkok" },
    attendees: [...new Set(opts.attendees.filter(Boolean))].map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return null;
    const ev = await res.json();
    return { meetUrl: ev.hangoutLink ?? null, htmlLink: ev.htmlLink ?? null, eventId: ev.id ?? null };
  } catch {
    return null;
  }
}

// บวกเวลา 1 ชม. จาก "HH:MM"
export function addOneHour(t: string): string {
  const [h, m] = (t || "10:00").split(":").map(Number);
  return `${String(((h || 10) + 1) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}
