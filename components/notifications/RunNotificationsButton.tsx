"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

export function RunNotificationsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cron/notifications");
      if (!res.ok) {
        setMsg("รันไม่สำเร็จ");
      } else {
        const j = await res.json();
        setMsg(j.created > 0 ? `สร้างแจ้งเตือนใหม่ ${j.created} รายการ` : "ไม่มีเรื่องใหม่ที่ต้องแจ้ง");
        router.refresh();
      }
    } catch {
      setMsg("เกิดข้อผิดพลาด");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy} className="btn-outline text-sm">
        <Icon name={busy ? "Loader" : "BellRing"} className={`size-4 ${busy ? "animate-spin" : ""}`} />
        ตรวจ & แจ้งเตือน
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
