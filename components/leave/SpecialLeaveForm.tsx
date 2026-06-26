"use client";

import { toCE } from "@/lib/utils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { notifyEmployee } from "@/lib/notify";

type Emp = { id: string; name: string };
type LType = { id: string; name: string; key?: string };

function daysBetween(a: string, b: string) {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return isNaN(d) ? 1 : Math.max(1, Math.round(d) + 1);
}

export function SpecialLeaveForm({ employees, leaveTypes }: { employees: Emp[]; leaveTypes: LType[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    employee_id: "",
    leave_type_id: leaveTypes[0]?.id ?? "",
    start: "",
    end: "",
    days: "",
    reason: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  const autoDays = f.start ? daysBetween(f.start, f.end || f.start) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employee_id || !f.start) {
      setError("เลือกพนักงานและวันที่เริ่ม");
      return;
    }
    setBusy(true);
    setError(null);
    const total = f.days ? Number(f.days) : autoDays;
    const { data: au } = await createClient().auth.getUser();
    const { error } = await createClient().from("leave_requests").insert({
      employee_id: f.employee_id,
      leave_type_id: f.leave_type_id,
      start_date: f.start,
      end_date: f.end || f.start,
      total_days: total,
      reason: f.reason || null,
      hr_comment: f.note || null,
      decided_by: au.user?.id ?? null,
      status: "awaiting_confirm",
    });
    setBusy(false);
    if (error) return setError(error.message);
    await notifyEmployee(f.employee_id, {
      title: "HR คีย์การลาให้ — รอคุณยืนยัน",
      body: "ตรวจรายละเอียดแล้วกดยืนยันในหน้าเวลา & การลา",
      link: "/time-leave",
      kind: "leave",
    });
    setOpen(false);
    setF({ employee_id: "", leave_type_id: leaveTypes[0]?.id ?? "", start: "", end: "", days: "", reason: "", note: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Icon name="FilePlus2" className="size-4" /> บันทึกลาเคสพิเศษ
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md my-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">บันทึกลาเคสพิเศษ</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted mb-5">คีย์ให้พนักงานหลังตกลงกันแล้ว — ระบบจะส่งให้พนักงานกดยืนยันอีกครั้ง</p>

        <div className="space-y-4">
          <div>
            <label className="label">พนักงาน</label>
            <select className="input" value={f.employee_id} onChange={(e) => set("employee_id", e.target.value)}>
              <option value="">— เลือกพนักงาน —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ประเภทการลา</label>
            <select className="input" value={f.leave_type_id} onChange={(e) => set("leave_type_id", e.target.value)}>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เริ่ม</label>
              <input type="date" className="input" value={f.start} onChange={(e) => set("start", toCE(e.target.value))} required />
            </div>
            <div>
              <label className="label">ถึงวันที่</label>
              <input type="date" className="input" value={f.end} onChange={(e) => set("end", toCE(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">จำนวนวัน {autoDays > 0 && !f.days && <span className="text-muted font-normal">(อัตโนมัติ {autoDays} วัน — แก้ได้)</span>}</label>
            <input type="number" step="0.5" className="input" placeholder={String(autoDays || "")} value={f.days} onChange={(e) => set("days", e.target.value)} />
          </div>
          <div>
            <label className="label">เหตุผล</label>
            <input className="input" placeholder="เช่น พักเพราะ burnout / ไปเรียนต่อ" value={f.reason} onChange={(e) => set("reason", e.target.value)} />
          </div>
          <div>
            <label className="label">บันทึกข้อตกลง (HR)</label>
            <textarea className="input" rows={2} placeholder="เช่น ตกลงลาไม่รับเงินเดือน 1 พ.ค.–31 ก.ค. กลับมาทำงานต่อ" value={f.note} onChange={(e) => set("note", e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={busy} className="btn-brand w-full">
            {busy ? "กำลังบันทึก…" : "บันทึก & ส่งให้พนักงานยืนยัน"}
          </button>
        </div>
      </form>
    </div>
  );
}
