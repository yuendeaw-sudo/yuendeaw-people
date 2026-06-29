"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { VaultForm } from "@/components/vault/VaultForm";

export function CredentialRow({ cred }: { cred: any }) {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    if (secret) {
      setShow((s) => !s);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/vault/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cred.id }),
      });
      if (r.ok) {
        const { secret } = await r.json();
        setSecret(secret);
        setShow(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    let s = secret;
    if (!s) {
      const r = await fetch("/api/vault/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cred.id }),
      });
      if (!r.ok) return;
      s = (await r.json()).secret;
      setSecret(s);
    }
    try {
      await navigator.clipboard.writeText(s!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function remove() {
    if (!confirm(`ลบบัญชี "${cred.label}"?`)) return;
    setBusy(true);
    await fetch("/api/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cred.id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-sand p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{cred.label}</div>
          {cred.username && <div className="text-xs text-muted break-all">{cred.username}</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <VaultForm existing={cred} />
          <button onClick={remove} disabled={busy} className="text-muted hover:text-rose p-1" title="ลบ">
            <Icon name="Trash2" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-sand/50 px-3 py-2 text-sm font-mono">
          {show && secret ? secret : "••••••••••••"}
        </code>
        <button onClick={reveal} disabled={busy} className="btn-outline !px-2.5 !py-2" title={show ? "ซ่อน" : "เปิดดู"}>
          <Icon name={show ? "EyeOff" : "Eye"} className="size-4" />
        </button>
        <button onClick={copy} disabled={busy} className="btn-outline !px-2.5 !py-2" title="คัดลอก">
          <Icon name={copied ? "Check" : "Copy"} className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        {cred.category && <span className="chip bg-sand text-muted">{cred.category}</span>}
        {cred.url && (
          <a href={cred.url} target="_blank" rel="noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">
            <Icon name="ExternalLink" className="size-3" /> เปิดลิงก์
          </a>
        )}
        <span>อัปเดตรหัส: {cred.rotated_at ? formatThaiDate(cred.rotated_at) : "—"}</span>
        <span>แก้ไขล่าสุด: {formatThaiDate(cred.updated_at)}</span>
      </div>
      {cred.note && <p className="mt-1.5 text-xs text-muted">{cred.note}</p>}
    </div>
  );
}
