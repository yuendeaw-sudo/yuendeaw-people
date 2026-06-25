"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Cat = { id: string; name: string };

export function DocForm({ categories, uploaderId }: { categories: Cat[]; uploaderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", category_id: "", external_url: "", doc_type: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) {
      setError("กรุณากรอกชื่อเอกสาร");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("documents").insert({
      title: f.title.trim(),
      category_id: f.category_id || null,
      external_url: f.external_url || null,
      doc_type: f.doc_type || null,
      visibility: "role",
      uploaded_by: uploaderId,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setF({ title: "", category_id: "", external_url: "", doc_type: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> เพิ่มเอกสาร
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={save} className="relative card p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">เพิ่มเอกสาร / ลิงก์</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div>
          <label className="label">ชื่อเอกสาร</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div>
          <label className="label">หมวดหมู่</label>
          <select className="input" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            <option value="">— เลือก —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">ลิงก์ (Google Drive / Notion / URL)</label>
          <input className="input" placeholder="https://" value={f.external_url} onChange={(e) => setF({ ...f, external_url: e.target.value })} />
        </div>
        {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
        <button disabled={busy} className="btn-brand w-full">
          {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </form>
    </div>
  );
}
