import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { computePayroll } from "@/lib/payroll";

export const runtime = "nodejs";

function csvCell(v: string | number | null) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const ctx = await getAccessContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!can(ctx, "people", "sensitive_view") && !can(ctx, "finance", "view")) {
    return new Response("forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const month = Number(url.searchParams.get("month")) || now.getMonth() + 1;

  const supabase = await createClient();
  const { rows, total, period } = await computePayroll(supabase, year, month);

  const header = ["รหัส", "ชื่อ-นามสกุล", "ประเภท", "สถานะ", "เงินเดือน", "เบี้ยฝึก", "โบนัสเดือนนี้", "สวัสดิการเดือนนี้", "รวม"];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) =>
      [r.code, r.name, r.type, r.status, r.salary, r.stipend, r.bonus, r.welfare, r.net].map(csvCell).join(",")
    ),
    ["", "", "", "", "", "", "", "รวมทั้งหมด", total].map(csvCell).join(","),
  ];
  // BOM so Excel reads UTF-8 Thai correctly
  const csv = "﻿" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${period.replace("/", "-")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
