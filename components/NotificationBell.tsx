"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";

type Notif = { id: string; title: string; body: string | null; link: string | null; kind: string; is_read: boolean; created_at: string };

const KIND_ICON: Record<string, string> = {
  probation: "Clock",
  subscription: "CreditCard",
  leave: "CalendarClock",
  quest: "Target",
  info: "Bell",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await createClient()
      .from("notifications")
      .select("id, title, body, link, kind, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // light poll
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  async function openNotif(n: Notif) {
    if (!n.is_read) {
      await createClient().from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((s) => s.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link) {
      router.push(n.link);
      router.refresh();
    }
  }

  async function markAll() {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    await createClient().from("notifications").update({ is_read: true }).in("id", ids);
    setItems((s) => s.map((x) => ({ ...x, is_read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="relative p-2 rounded-xl hover:bg-sand/60 transition" title="การแจ้งเตือน">
        <Icon name="Bell" className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-4 h-4 px-1 rounded-full bg-rose text-white text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] card p-0 overflow-hidden z-50 shadow-pop">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand/70">
            <span className="font-semibold text-sm">การแจ้งเตือน</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-gold font-semibold hover:underline">อ่านทั้งหมด</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length ? (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotif(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-sand/50 last:border-0 hover:bg-sand/40 transition ${n.is_read ? "" : "bg-brand-soft/40"}`}
                >
                  <div className="grid place-items-center size-8 rounded-lg bg-sand text-muted shrink-0">
                    <Icon name={KIND_ICON[n.kind] ?? "Bell"} className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    {n.body && <div className="text-xs text-muted mt-0.5">{n.body}</div>}
                    <div className="text-[11px] text-muted/70 mt-1">{formatThaiDate(n.created_at)}</div>
                  </div>
                  {!n.is_read && <span className="size-2 rounded-full bg-brand shrink-0 mt-1.5" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted">
                <Icon name="BellOff" className="size-6 mx-auto mb-2 opacity-50" />
                ยังไม่มีการแจ้งเตือน
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
