import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// OAuth (Google) redirect lands here. Exchange the code for a session cookie,
// then send the user on. The (app) layout decides if they're allowed in.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
