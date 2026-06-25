"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { INCIDENT_CATEGORIES, INCIDENT_LEVELS } from "@/lib/phase2-labels";

export function IncidentForm({
  employees,
  reporterId,
}: {
  employees: { id: string; name: string }[];
  reporterId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    employee_id: "",
    category: "late",
    level: 1,
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employee_id || !f.title.trim()) {
      setError("กรุณาเลือกพนักงานและกรอกหัวข้อ");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("incidents").insert({
      employee_id: f.employee_id,
      reported_by: reporterId,
      category: f.category,
      level: f.level,
      title: f.title.trim(),
      description: f.description || null,
      status: "open",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    setF({ employee_id: "", category: "late", level: 1, title: "", description: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> บันทึกเหตุการณ์
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">บันทึกเหตุการณ์ / วินัย</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">พนักงาน</label>
            <select className="input" value={f.employee_id} onChange={(e) => setF({ ...f, employee_id: e.target.value })}>
              <option value="">— เลือกพนักงาน —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">หมวดหมู่</label>
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {INCIDENT_CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ระดับความรุนแรง</label>
              <select className="input" value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })}>
                {INCIDENT_LEVELS.map((l) => (
                  <option key={l.v} value={l.v}>{l.v} · {l.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">หัวข้อ</label>
            <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div>
            <label className="label">รายละเอียด</label>
            <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <p className="text-xs text-muted">
            <Icon name="Info" className="size-3.5 inline" /> ระบบจะเปิดเคสสถานะ "เปิดเคส" และส่งให้ HR พิจารณาตามขั้นตอน ไม่ลงโทษทันที
          </p>
          <button type="submit" disabled={loading} className="btn-brand w-full">
            {loading ? "กำลังบันทึก…" : "บันทึกเหตุการณ์"}
          </button>
        </div>
      </form>
    </div>
  );
}
