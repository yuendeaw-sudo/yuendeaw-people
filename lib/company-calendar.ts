/** Published company dates, independent of government/bank calendars. */
export type CompanyHoliday = { date: string; name: string; special?: boolean };
export const COMPANY_HOLIDAYS: Record<number, CompanyHoliday[]> = {
  2027: [
    { date: "2027-01-01", name: "วันขึ้นปีใหม่" },
    { date: "2027-02-08", name: "ชดเชยวันตรุษจีน (6 ก.พ.)" },
    { date: "2027-04-13", name: "วันสงกรานต์" },
    { date: "2027-04-14", name: "วันสงกรานต์" },
    { date: "2027-04-15", name: "วันสงกรานต์" },
    { date: "2027-05-03", name: "ชดเชยวันแรงงานแห่งชาติ (1 พ.ค.)" },
    { date: "2027-05-20", name: "วันวิสาขบูชา" },
    { date: "2027-07-19", name: "วันเข้าพรรษา" },
    { date: "2027-08-12", name: "วันแม่แห่งชาติ / วันเฉลิมพระชนมพรรษาฯ" },
    { date: "2027-12-06", name: "ชดเชยวันชาติและวันพ่อแห่งชาติ (5 ธ.ค.)" },
    { date: "2027-12-10", name: "วันรัฐธรรมนูญ" },
    { date: "2027-12-27", name: "ชดเชยวันคริสต์มาส (25 ธ.ค.)" },
    { date: "2027-12-28", name: "วันหยุดพิเศษช่วงเทศกาลปีใหม่", special: true },
    { date: "2027-12-29", name: "วันหยุดพิเศษช่วงเทศกาลปีใหม่", special: true },
    { date: "2027-12-30", name: "วันหยุดพิเศษช่วงเทศกาลปีใหม่", special: true },
    { date: "2027-12-31", name: "วันสิ้นปี" },
  ],
};

export function bangkokDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export type CalendarLeave = {
  id: string; start_date: string; end_date: string; total_days: number | string;
  status: string; name: string; key: string;
};

/** Keep recorded day totals intact; distinguish started leave from future bookings.
 * Attribution follows the existing system's start-date year, including cross-year requests.
 */
export function summarizeLeave(requests: CalendarLeave[], year: number, today: string) {
  const rows = requests.filter(r => r.start_date.startsWith(`${year}-`));
  const sum = (key: string, future: boolean) => rows
    .filter(r => r.key === key && r.status === "approved" && (r.start_date > today) === future)
    .reduce((n, r) => n + Number(r.total_days || 0), 0);
  return {
    sick: sum("sick", false), personal: sum("personal", false), annual: sum("annual", false),
    planned: rows.filter(r => r.status === "approved" && r.start_date > today),
    pending: rows.filter(r => ["pending", "awaiting_confirm"].includes(r.status)),
  };
}
