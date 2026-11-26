import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { employeeForUser } from "@/lib/office-employee";
import { localReturnPath } from "@/lib/office-policy";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const url = new URL(req.url), supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  try {
    if (user && await employeeForUser(user)) return NextResponse.redirect(new URL(localReturnPath(url.searchParams.get("next")), url.origin));
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=employee", url.origin));
  } catch { return NextResponse.redirect(new URL("/login?error=directory", url.origin)); }
}
