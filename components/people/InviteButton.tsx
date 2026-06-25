"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

type Props = {
  employeeId: string;
  email: string | null;
  hasAccount: boolean;
  invitedAt: string | null;
};

export function InviteButton({ employeeId, email, hasAccount, invitedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ emailed: boolean; inviteText: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (hasAccount) {
    return (
      <span className="chip bg-mint-soft text-mint border border-mint/30">
        <Icon name="CircleCheck" className="size-3.5" /> เข้าใช้งานแล้ว
      </span>
    );
  }

  if (!email) {
    return (
      <span className="chip border border-sand text-muted" title="เพิ่มอีเมลของพนักงานก่อนจึงจะส่งคำเชิญได้">
        <Icon name="MailX" className="size-3.5" /> ยังไม่มีอีเมล
      </span>
    );
  }

  async function invite() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await r.json();
      if (data.ok) setResult({ emailed: data.emailed, inviteText: data.inviteText });
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={invite} disabled={loading} className="btn-outline">
        <Icon name="Send" className="size-4" />
        {loading ? "กำลังส่ง…" : invitedAt || result ? "ส่งคำเชิญอีกครั้ง" : "ส่งคำเชิญ"}
      </button>

      {result && (
        <div className="card p-3 w-72 text-left">
          {result.emailed ? (
            <p className="text-sm text-mint flex items-center gap-1.5">
              <Icon name="MailCheck" className="size-4" /> ส่งคำเชิญทางอีเมลแล้ว
            </p>
          ) : (
            <p className="text-xs text-muted">
              ส่งอีเมลอัตโนมัติยังไม่เปิด — คัดลอกข้อความนี้ส่งให้พนักงานได้เลย
            </p>
          )}
          <pre className="mt-2 whitespace-pre-wrap text-xs bg-sand/40 rounded-lg p-2 leading-relaxed">
            {result.inviteText}
          </pre>
          <button onClick={copy} className="btn-outline w-full mt-2 text-sm">
            <Icon name={copied ? "Check" : "Copy"} className="size-3.5" />
            {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความเชิญ"}
          </button>
        </div>
      )}
    </div>
  );
}
