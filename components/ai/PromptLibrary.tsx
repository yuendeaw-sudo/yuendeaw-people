"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Prompt = { id: string; title: string; category: string | null; body: string };

export function PromptLibrary({
  prompts,
  employeeId,
  canCreate,
}: {
  prompts: Prompt[];
  employeeId: string | null;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [f, setF] = useState({ title: "", category: "", body: "" });
  const [busy, setBusy] = useState(false);

  async function copy(p: Prompt) {
    await navigator.clipboard.writeText(p.body);
    setCopied(p.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return;
    setBusy(true);
    await createClient().from("prompt_templates").insert({
      title: f.title.trim(),
      category: f.category || null,
      body: f.body.trim(),
      created_by: employeeId,
    });
    setF({ title: "", category: "", body: "" });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted">Prompt Library</h2>
        {canCreate && (
          <button onClick={() => setOpen(true)} className="btn-ghost text-xs px-3 py-1.5">
            <Icon name="Plus" className="size-3.5" /> เพิ่ม prompt
          </button>
        )}
      </div>

      {prompts.length ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {prompts.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm">{p.title}</div>
                <button onClick={() => copy(p)} className="text-muted hover:text-gold shrink-0" title="คัดลอก">
                  <Icon name={copied === p.id ? "Check" : "Copy"} className="size-4" />
                </button>
              </div>
              {p.category && <div className="text-[11px] text-muted mt-0.5">{p.category}</div>}
              <p className="text-xs text-muted mt-2 line-clamp-3 whitespace-pre-wrap">{p.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">ยังไม่มี prompt — เพิ่ม prompt ที่ใช้บ่อยเพื่อแชร์กับทีม</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form onSubmit={save} className="relative card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">เพิ่ม Prompt</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <Icon name="X" className="size-5" />
              </button>
            </div>
            <div>
              <label className="label">ชื่อ</label>
              <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>
            <div>
              <label className="label">หมวด (ถ้ามี)</label>
              <input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
            </div>
            <div>
              <label className="label">เนื้อหา Prompt</label>
              <textarea className="input" rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            </div>
            <button disabled={busy} className="btn-brand w-full">
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
