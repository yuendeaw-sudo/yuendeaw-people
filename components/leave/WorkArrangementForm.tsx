"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function WorkArrangementForm({
  employeeId,
  wfhTypeId,
  onsiteTypeId,
  wfhRemaining,
}: {
  employeeId: string;
  wfhTypeId: string | null;
  onsiteTypeId: string | null;
  wfhRemaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"wfh" | "onsite">("wfh");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("เลือกวันที่ก่อนนะ");
      return;
    }
    if (mode === "wfh" && wfhRemaining <= 0) {
      setError("WFH ปีนี้ครบ 20 ครั้งแล้ว");
      return;
    }
    const typeId = mode === "wfh" ? wfhTypeId : onsiteTypeId;
    if (!typeId) {
      setError("ไม่พบประเภทนี้ในระบบ");
      return;
    }
    setLoading(true);
    setError(null);
    // self-service log — auto-approved (not a leave day)
    const { error } = await createClient().from("leave_requests").insert({
      employee_id: employeeId,
      leave_type_id: typeId,
      start_date: date,
      end_date: date,
      total_days: 1,
      reason: note || null,
      status: "approved",
    });
    setLoading(false);
    if (error) return setError(error.message);
    setOpen(false);
    setDate("");
    setNote("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Icon name="Laptop" className="size-4" /> แจ้งทำงานนอกออฟฟิศ
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">แจ้งทำงานนอกออฟฟิศ</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">ไม่ใช่การลานะ — แค่บอกทีมว่าวันนั้นทำงานจากที่ไหน</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("wfh")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold ${mode === "wfh" ? "border-brand bg-brand-soft text-gold" : "border-sand"}`}
          >
            🏠 Work from home
            <div className="text-xs font-normal text-muted mt-0.5">เหลือ {wfhRemaining}/20 ครั้ง</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("onsite")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold ${mode === "onsite" ? "border-brand bg-brand-soft text-gold" : "border-sand"}`}
          >
            🎬 ออกกอง / นอกสถานที่
            <div className="text-xs font-normal text-muted mt-0.5">ไม่จำกัด</div>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">วันที่</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">หมายเหตุ (ถ้ามี)</label>
            <input className="input" placeholder={mode === "onsite" ? "เช่น ออกกองที่..." : "เช่น ทำงานที่บ้าน"} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full">
            {loading ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
