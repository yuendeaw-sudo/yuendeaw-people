import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { employeeForUser } from "@/lib/office-employee";
import { localReturnPath } from "@/lib/office-policy";

export const runtime = "nodejs";

// OAuth (Google) redirect lands here. Exchange the code for a session cookie,
// then send the user on. The (app) layout decides if they're allowed in.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = localReturnPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !await employeeForUser(user)) {
          await supabase.auth.signOut({ scope: "local" });
          return NextResponse.redirect(`${origin}/login?error=employee`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(`${origin}/login?error=directory`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
