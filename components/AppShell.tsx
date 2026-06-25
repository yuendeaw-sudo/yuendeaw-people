"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

type NavGroup = { section: string; items: { key: string; label: string; href: string; icon: string }[] };

export function AppShell({
  nav,
  user,
  children,
}: {
  nav: NavGroup[];
  user: { name: string; email: string; roleLabel: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="font-extrabold tracking-tight">People OS</div>
          <div className="text-[11px] text-muted">ยืนเดี่ยว · YuenDeaw</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {nav.map((group) => (
          <div key={group.section}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-brand text-ink shadow-card"
                        : "text-ink/80 hover:bg-sand/70"
                    )}
                  >
                    <Icon name={item.icon} className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sand/70 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-muted">{user.roleLabel}</div>
          </div>
          <button onClick={signOut} title="ออกจากระบบ" className="text-muted hover:text-rose p-1.5">
            <Icon name="LogOut" className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-surface border-r border-sand/70 sticky top-0 h-screen">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-pop">{SidebarInner}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-surface/90 backdrop-blur border-b border-sand/70">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2">
            <Icon name="Menu" className="size-5" />
          </button>
          <span className="font-extrabold">People OS</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Avatar name={user.name} size={30} />
          </div>
        </header>

        {/* Desktop topbar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end h-14 px-8 bg-paper/80 backdrop-blur">
          <NotificationBell />
        </header>

        <main className="p-4 sm:p-6 lg:px-8 lg:pb-8 lg:pt-2 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
