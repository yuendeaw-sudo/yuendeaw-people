"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { toCE } from "@/lib/utils";

export function VaultForm({ existing }: { existing?: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const e = existing ?? {};
  const [f, setF] = useState({
    label: e.label ?? "",
    username: e.username ?? "",
    url: e.url ?? "",
    category: e.category ?? "",
    secret: "",
    rotated_at: e.rotated_at ?? "",
    note: e.note ?? "",
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.label.trim()) return setErr("ใส่ชื่อบัญชีก่อน");
    if (!existing && !f.secret) return setErr("ใส่รหัสผ่านก่อน");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existing?.id,
          ...f,
          rotated_at: f.rotated_at ? toCE(f.rotated_at) : null,
        }),
      });
      if (!r.ok) return setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      setOpen(false);
      setF({ label: "", username: "", url: "", category: "", secret: "", rotated_at: "", note: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return existing ? (
      <button onClick={() => setOpen(true)} className="text-muted hover:text-gold" title="แก้ไข">
        <Icon name="Pencil" className="size-4" />
      </button>
    ) : (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> เพิ่มบัญชี
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-md my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{existing ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <I label="ชื่อบัญชี *" v={f.label} on={(v) => set("label", v)} ph="เช่น Gmail แก๊ป, communeed.studio" />
          <I label="อีเมล / ยูสเซอร์" v={f.username} on={(v) => set("username", v)} ph="you@gmail.com" />
          <div>
            <label className="label">รหัสผ่าน {existing && <span className="text-muted">(เว้นว่าง = ไม่เปลี่ยน)</span>}</label>
            <div className="flex gap-2">
              <input
                type={show ? "text" : "password"}
                className="input flex-1"
                value={f.secret}
                onChange={(ev) => set("secret", ev.target.value)}
                autoComplete="new-password"
                placeholder={existing ? "••••••••" : ""}
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="btn-outline !px-3" title={show ? "ซ่อน" : "แสดง"}>
                <Icon name={show ? "EyeOff" : "Eye"} className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <I label="หมวด" v={f.category} on={(v) => set("category", v)} ph="เช่น โซเชียล, อีเมล" />
            <div>
              <label className="label">วันอัปเดตรหัสล่าสุด</label>
              <input type="date" className="input" value={f.rotated_at} onChange={(ev) => set("rotated_at", ev.target.value)} />
            </div>
          </div>
          <I label="ลิงก์" v={f.url} on={(v) => set("url", v)} ph="https://..." />
          <div>
            <label className="label">หมายเหตุ</label>
            <textarea className="input" rows={2} value={f.note} onChange={(ev) => set("note", ev.target.value)} />
          </div>
          <p className="text-[11px] text-muted flex items-start gap-1.5">
            <Icon name="Lock" className="size-3.5 shrink-0 mt-0.5 text-mint" />
            รหัสผ่านจะถูกเข้ารหัสก่อนเก็บ และเห็นได้เฉพาะคุณ (เจ้าของ) เท่านั้น
          </p>
          {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy} className="btn-brand w-full">{busy ? "…" : "บันทึก"}</button>
        </div>
      </form>
    </div>
  );
}

function I({ label, v, on, ph }: { label: string; v: string; on: (v: string) => void; ph?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" placeholder={ph} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
