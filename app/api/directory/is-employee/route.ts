import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Employment statuses that count as a current employee (can access other
// YuenDeaw systems like ai.yuendeaw.com). Excludes inactive/alumni/candidate.
const ACTIVE_STATUSES = ["active", "probation", "intern", "freelance"];

// Central employee-directory check used by sibling apps (e.g. ai.yuendeaw.com)
// to authorize a Google login without their own allowlist.
//   GET /api/directory/is-employee?email=foo@gmail.com
//   Authorization: Bearer <DIRECTORY_API_TOKEN>
// → { employee: boolean, status: string | null }
//
// Uses a raw PostgREST fetch (not supabase-js) to stay independent of the
// realtime client's Node-version requirements.
export async function GET(req: Request) {
  const token = process.env.DIRECTORY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "directory not configured" }, { status: 503 });
  }
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  if (bearer !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "directory not configured" }, { status: 503 });
  }

  let row: { status?: string } | null = null;
  try {
    const res = await fetch(
      `${url}/rest/v1/employees?select=status&limit=1&email=ilike.${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: "lookup failed", upstream_status: res.status, upstream: body.slice(0, 200) },
        { status: 500 }
      );
    }
    const rows = (await res.json()) as { status?: string }[];
    row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (e) {
    return NextResponse.json(
      { error: "lookup failed", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }

  const employee = !!row && ACTIVE_STATUSES.includes(row.status ?? "");
  return NextResponse.json(
    { employee, status: row?.status ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
