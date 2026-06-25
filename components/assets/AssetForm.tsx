"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Opt = { id: string; name: string };

const TYPES = ["laptop", "camera", "lens", "microphone", "monitor", "keycard", "software", "storage", "อื่น ๆ"];

export function AssetForm({ existing, employees }: { existing?: any; employees: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const e = existing ?? {};
  const [f, setF] = useState({
    asset_type: e.asset_type ?? "laptop",
    name: e.name ?? "",
    serial_number: e.serial_number ?? "",
    assigned_to: e.assigned_to ?? "",
    assigned_date: e.assigned_date ?? "",
    return_date: e.return_date ?? "",
    condition: e.condition ?? "",
    location: e.location ?? "",
    note: e.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.name.trim()) {
      setError("ใส่ชื่อทรัพย์สินก่อน");
      return;
    }
    setBusy(true);
    setError(null);
    const payload: any = {
      asset_type: f.asset_type,
      name: f.name.trim(),
      serial_number: f.serial_number || null,
      assigned_to: f.assigned_to || null,
      assigned_date: f.assigned_date || null,
      return_date: f.return_date || null,
      condition: f.condition || null,
      location: f.location || null,
      note: f.note || null,
    };
    const sb = createClient();
    const { error } = existing
      ? await sb.from("company_assets").update(payload).eq("id", existing.id)
      : await sb.from("company_assets").insert(payload);
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("ลบทรัพย์สินนี้?")) return;
    setBusy(true);
    await createClient().from("company_assets").delete().eq("id", existing.id);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {existing ? (
        <button onClick={() => setOpen(true)} className="text-muted hover:text-gold" title="แก้ไข">
          <Icon name="Pencil" className="size-4" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-brand">
          <Icon name="Plus" className="size-4" /> เพิ่มทรัพย์สิน
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{existing ? "แก้ไขทรัพย์สิน" : "เพิ่มทรัพย์สิน"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <Icon name="X" className="size-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">ประเภท</label>
                <select className="input" value={f.asset_type} onChange={(ev) => set("asset_type", ev.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ชื่อ/รุ่น *</label>
                <input className="input" placeholder="เช่น MacBook Pro 14, Sony A7IV" value={f.name} onChange={(ev) => set("name", ev.target.value)} />
              </div>
              <div>
                <label className="label">Serial number</label>
                <input className="input" value={f.serial_number} onChange={(ev) => set("serial_number", ev.target.value)} />
              </div>
              <div>
                <label className="label">มอบให้</label>
                <select className="input" value={f.assigned_to} onChange={(ev) => set("assigned_to", ev.target.value)}>
                  <option value="">— ยังไม่มอบ —</option>
                  {employees.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">วันที่มอบ</label>
                <input type="date" className="input" value={f.assigned_date} onChange={(ev) => set("assigned_date", ev.target.value)} />
              </div>
              <div>
                <label className="label">วันที่คืน</label>
                <input type="date" className="input" value={f.return_date} onChange={(ev) => set("return_date", ev.target.value)} />
              </div>
              <div>
                <label className="label">สภาพ</label>
                <input className="input" placeholder="เช่น ดี / มีรอย" value={f.condition} onChange={(ev) => set("condition", ev.target.value)} />
              </div>
              <div>
                <label className="label">ที่เก็บ/สถานที่</label>
                <input className="input" value={f.location} onChange={(ev) => set("location", ev.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">หมายเหตุ</label>
              <textarea className="input" rows={2} value={f.note} onChange={(ev) => set("note", ev.target.value)} />
            </div>
            {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={busy} className="btn-brand flex-1">{busy ? "…" : "บันทึก"}</button>
              {existing && <button type="button" onClick={remove} disabled={busy} className="btn bg-rose-soft text-rose px-4">ลบ</button>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
