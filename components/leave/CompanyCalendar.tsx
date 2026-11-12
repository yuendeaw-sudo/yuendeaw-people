"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, statusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { COMPANY_HOLIDAYS, summarizeLeave, type CalendarLeave } from "@/lib/company-calendar";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const shortDate = (date: string) => new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

export function CompanyCalendar({ requests, today, hasEmployee, loadError }: {
  requests: CalendarLeave[]; today: string; hasEmployee: boolean; loadError: boolean;
}) {
  const currentYear = Number(today.slice(0, 4));
  const initialYear = Math.max(2027, currentYear);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialYear === currentYear ? Number(today.slice(5, 7)) - 1 : 0);
  const [view, setView] = useState<"month" | "year">("month");
  const years = [...new Set([currentYear, 2027, ...requests.map(r => Number(r.start_date.slice(0, 4)))])].sort((a, b) => b - a);
  const holidays = COMPANY_HOLIDAYS[year];
  const summary = summarizeLeave(requests, year, today);
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthHolidays = (holidays ?? []).filter(h => h.date.startsWith(prefix));
  const monthRequests = requests.filter(r => r.key !== "wfh" && r.start_date <= `${prefix}-31` && r.end_date >= `${prefix}-01`);
  const firstDay = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">ปี
        <select aria-label="ปีปฏิทิน" className="input !w-auto" value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
        </select>
      </label>
      <div className="flex gap-2" aria-label="มุมมองปฏิทิน">
        <button type="button" aria-pressed={view === "month"} className={view === "month" ? "btn-brand" : "btn bg-sand"} onClick={() => setView("month")}>รายเดือน</button>
        <button type="button" aria-pressed={view === "year"} className={view === "year" ? "btn-brand" : "btn bg-sand"} onClick={() => setView("year")}>วันหยุดทั้งปี</button>
      </div>
    </div>

    <Card className="!p-4 bg-brand-soft/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2"><Icon name="CalendarDays" className="size-5 text-gold" />วันหยุดบริษัท ปี {year + 543}</h2>
        {holidays && <Badge tone="brand">{holidays.length} วัน</Badge>}
      </div>
      {!holidays && <p className="text-sm text-muted mt-2">ยังไม่ประกาศวันหยุดปีนี้</p>}
    </Card>

    {hasEmployee && (loadError ? <Card><p role="alert" className="text-sm text-rose">โหลดข้อมูลการลาส่วนตัวไม่สำเร็จ กรุณาลองใหม่ วันหยุดบริษัทยังดูได้ตามปกติ</p></Card> : <section aria-label="บันทึกการลาของฉัน" className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[{ label: "ลาป่วย", value: summary.sick }, { label: "ลากิจ", value: summary.personal }, { label: "พักร้อน", value: summary.annual }, { label: "Work from home", value: summary.wfh }].map(item => <Card key={item.label} className="!p-3 sm:!p-4">
          <p className="text-xs sm:text-sm text-muted">{item.label}</p><p className="text-2xl font-bold mt-1">{item.value} <span className="text-sm font-normal">วัน</span></p>
        </Card>)}
      </div>
      <div className="flex flex-wrap gap-2 text-sm"><Badge tone="mint">อนุมัติลาล่วงหน้า {summary.planned.length} รายการ</Badge><Badge tone="amber">รออนุมัติ / รอยืนยัน {summary.pending.length} รายการ</Badge></div>
    </section>)}

    {view === "year" ? <Card>
      <h2 className="font-semibold mb-3">วันหยุดทั้งปี</h2>
      {holidays ? <ul className="divide-y divide-sand">{holidays.map(h => <li key={h.date} className="flex flex-wrap items-center gap-2 py-3 text-sm">
        <span className="font-semibold w-20 shrink-0">{shortDate(h.date)}</span><span className="flex-1 min-w-0">{h.name}</span>{h.special && <Badge tone="grape">บริษัทเพิ่มให้</Badge>}
      </li>)}</ul> : <p className="text-sm text-muted">จะแสดงรายการเมื่อมีประกาศสำหรับปีนี้</p>}
    </Card> : <Card className="!p-3 sm:!p-5">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="font-semibold">{MONTHS[month]} {year + 543}</h2>
        <select className="input !w-auto" aria-label="เดือนปฏิทิน" value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-3"><span>● วันหยุดบริษัท</span><span className="text-mint">● ลาของฉันที่อนุมัติ</span><span className="text-gold">○ รออนุมัติ / รอยืนยัน</span></div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label={`ปฏิทิน ${MONTHS[month]} ${year + 543}`}>
        {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(d => <div key={d} className="text-center text-xs text-muted py-1">{d}</div>)}
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${prefix}-${String(i + 1).padStart(2, "0")}`;
          const holiday = monthHolidays.find(h => h.date === date);
          const leave = monthRequests.filter(r => r.start_date <= date && r.end_date >= date && ["approved", "pending", "awaiting_confirm"].includes(r.status));
          const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
          const label = [shortDate(date), holiday?.name, ...leave.map(r => `${r.name} ${statusBadge(r.status).label}`)].filter(Boolean).join(" · ");
          return <div key={date} role="group" aria-label={label} title={label} className={`min-h-16 sm:min-h-24 rounded-lg border p-1.5 sm:p-2 ${holiday ? "border-brand bg-brand-soft" : "border-sand"} ${weekend && !holiday ? "bg-sand/40" : ""} ${date === today ? "ring-2 ring-grape" : ""}`}>
            <span className="text-sm font-semibold">{i + 1}</span>
            {holiday && <><span aria-hidden="true" className="block text-gold text-xs sm:hidden">●</span><span aria-hidden="true" className="hidden sm:block text-[11px] text-gold mt-1 leading-snug">{holiday.name}</span></>}
            {leave.map(r => <span aria-hidden="true" key={r.id} className={`block text-[11px] mt-1 ${r.status === "approved" ? "text-mint" : "text-gold"}`}><span className="sm:hidden">{r.status === "approved" ? "●" : "○"}</span><span className="hidden sm:inline">{r.name}</span></span>)}
          </div>;
        })}
      </div>
      <div className="mt-4 space-y-2 text-sm" aria-label="รายละเอียดในเดือนนี้">
        {monthHolidays.map(h => <p key={h.date}><b>{shortDate(h.date)}</b> · {h.name}</p>)}
        {monthRequests.map(r => <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-sand/40 p-3"><span>{shortDate(r.start_date)}{r.start_date !== r.end_date && ` – ${shortDate(r.end_date)}`} · {r.name} {r.total_days} วัน</span><Badge tone={statusBadge(r.status).tone}>{statusBadge(r.status).label}</Badge></div>)}
        {!monthHolidays.length && !monthRequests.length && <p className="text-muted">{holidays ? "ไม่มีวันหยุดบริษัทหรือรายการลาของฉันในเดือนนี้" : "ไม่มีรายการลาของฉันในเดือนนี้ · วันหยุดบริษัทยังรอประกาศ"}</p>}
      </div>
    </Card>}
    <div className="flex flex-wrap gap-3"><Link href="/time-leave" className="btn-brand"><Icon name="CalendarPlus" className="size-4" />วางแผนและขอลา</Link><Link href="/profile" className="btn bg-sand">ดูประวัติในโปรไฟล์</Link><a href="#leave-policy" className="btn bg-sand">ดูสิทธิและกติกาการลา</a></div>
    <p className="text-xs text-muted">ข้อมูลการลาส่วนตัวในปฏิทินนี้แสดงเฉพาะของคุณ เพื่อช่วยจัดเวลาพัก ธุระ และการส่งต่องานร่วมกับทีม</p>
  </div>;
}
