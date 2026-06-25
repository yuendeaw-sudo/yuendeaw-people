"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { PERF_DIMENSIONS, REVIEW_CYCLES } from "@/lib/phase2-labels";

export function TemplateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [dims, setDims] = useState<string[]>(PERF_DIMENSIONS.map((d) => d.key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(k: string) {
    setDims((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || dims.length === 0) {
      setError("กรอกชื่อและเลือกอย่างน้อย 1 มิติ");
      return;
    }
    setLoading(true);
    setError(null);
    const dimensions = PERF_DIMENSIONS.filter((d) => dims.includes(d.key)).map((d) => ({
      key: d.key,
      label: d.label,
      weight: 1,
    }));
    const { error } = await createClient().from("performance_templates").insert({
      name: name.trim(),
      review_cycle: cycle,
      dimensions,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setOpen(false);
    setName("");
    setDims(PERF_DIMENSIONS.map((d) => d.key));
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Icon name="Plus" className="size-4" /> สร้าง KPI Template
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">สร้าง KPI Template</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">ชื่อ Template</label>
              <input className="input" placeholder="เช่น KPI สำหรับ Editor" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">รอบประเมิน</label>
              <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                {REVIEW_CYCLES.map((c) => (
                  <option key={c.v} value={c.v}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">มิติการประเมิน</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {PERF_DIMENSIONS.map((d) => (
                <label
                  key={d.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                    dims.includes(d.key) ? "border-brand bg-brand-soft" : "border-sand"
                  }`}
                >
                  <input type="checkbox" checked={dims.includes(d.key)} onChange={() => toggle(d.key)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full">
            {loading ? "กำลังบันทึก…" : "สร้าง Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
