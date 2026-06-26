import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Employment statuses that count as a current employee (can access other
// YuenDeaw systems like ai.yuendeaw.com). Excludes inactive/alumni/candidate.
const ACTIVE_STATUSES = ["active", "probation", "intern", "freelance"];

// Central employee-directory check used by sibling apps (e.g. ai.yuendeaw.com)
// to authorize a Google login without their own allowlist.
//   GET /api/directory/is-employee?email=foo@gmail.com
//   Authorization: Bearer <DIRECTORY_API_TOKEN>
// → { employee: boolean, status: string | null }
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employees")
    .select("status")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }

  const employee = !!data && ACTIVE_STATUSES.includes(data.status);
  return NextResponse.json(
    { employee, status: data?.status ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
