import { NextResponse } from "next/server";
import { employeeForToken } from "@/lib/office-employee";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (req.headers.has("origin")) return reply({ error: "Server requests only" }, 403);
  const id = req.headers.get("x-office-client-id");
  const key = ["ADS", "AI", "WWW"].find(k => !!process.env[`OFFICE_${k}_CLIENT_ID`] && process.env[`OFFICE_${k}_CLIENT_ID`] === id);
  if (!id || !key) return reply({ error: "Unauthorized client" }, 401);
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  try {
    const identity = token ? await employeeForToken(token, id) : null;
    return identity ? reply(identity) : reply({ error: "Employee access required" }, 403);
  } catch { return reply({ error: "Employee directory unavailable" }, 503); }
}
