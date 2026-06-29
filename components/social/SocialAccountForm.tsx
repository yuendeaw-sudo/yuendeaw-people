"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { PLATFORMS } from "@/lib/social";

type Opt = { id: string; name: string };
type Account = { id: string; label: string; email: string | null };

export function SocialAccountForm({
  existing,
  employees,
  accounts,
}: {
  existing?: any;
  employees: Opt[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const e = existing ?? {};
  const [f, setF] = useState({
    platform: e.platform ?? "facebook",
    name: e.name ?? "",
    handle: e.handle ?? "",
    url: e.url ?? "",
    account_id: e.account_id ?? "",
    login_email: e.login_email ?? "",
    owner_id: e.owner_id ?? "",
    twofa_status: e.twofa_status ?? "",
    recovery_email: e.recovery_email ?? "",
    recovery_phone: e.recovery_phone ?? "",
    followers: e.followers ?? "",
    password_manager_ref: e.password_manager_ref ?? "",
    status: e.status ?? "active",
    note: e.note ?? "",
  });
  const [adminIds, setAdminIds] = useState<string[]>(
    Array.isArray(e.admin_ids) ? e.admin_ids : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }
  function toggleAdmin(id: string) {
    setAdminIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.name.trim()) return setError("ใส่ชื่อเพจ/บัญชีก่อน");
    setBusy(true);
    setError(null);
    const payload: any = {
      platform: f.platform,
      name: f.name.trim(),
      handle: f.handle || null,
      url: f.url || null,
      account_id: f.account_id || null,
      login_email: f.login_email || null,
      owner_id: f.owner_id || null,
      admin_ids: adminIds,
      twofa_status: f.twofa_status || null,
      recovery_email: f.recovery_email || null,
      recovery_phone: f.recovery_phone || null,
      followers: f.followers || null,
      password_manager_ref: f.password_manager_ref || null,
      status: f.status,
      note: f.note || null,
    };
    const sb = createClient();
    const { error } = existing
      ? await sb.from("social_accounts").update(payload).eq("id", existing.id)
      : await sb.from("social_accounts").insert(payload);
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("ลบบัญชีนี้?")) return;
    setBusy(true);
    await createClient().from("social_accounts").delete().eq("id", existing.id);
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
          <Icon name="Plus" className="size-4" /> เพิ่มบัญชี
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{existing ? "แก้ไขบัญชีโซเชียล" : "เพิ่มบัญชีโซเชียล"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <Icon name="X" className="size-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">แพลตฟอร์ม</label>
                <select className="input" value={f.platform} onChange={(ev) => set("platform", ev.target.value)}>
                  {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
                </select>
              </div>
              <I label="ชื่อเพจ/บัญชี *" v={f.name} on={(v) => set("name", v)} ph="เช่น ยืนเดี่ยว Stand-up" />
              <I label="@handle" v={f.handle} on={(v) => set("handle", v)} ph="@yuendeaw" />
              <I label="ลิงก์" v={f.url} on={(v) => set("url", v)} ph="https://..." />

              <div>
                <label className="label">ล็อกอินผ่านบัญชี (GSuite)</label>
                <select className="input" value={f.account_id} onChange={(ev) => set("account_id", ev.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}{a.email && a.label !== a.email ? ` · ${a.email}` : ""}</option>
                  ))}
                </select>
              </div>
              <I label="หรืออีเมลล็อกอินอื่น" v={f.login_email} on={(v) => set("login_email", v)} ph="ถ้าไม่ใช่ GSuite" />

              <div>
                <label className="label">ผู้ดูแลคอนเทนต์</label>
                <select className="input" value={f.owner_id} onChange={(ev) => set("owner_id", ev.target.value)}>
                  <option value="">— เลือก —</option>
                  {employees.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <I label="ผู้ติดตาม (ถ้ามี)" v={f.followers} on={(v) => set("followers", v)} ph="เช่น 12K" />

              {/* ผู้มีสิทธิ์ admin — สำคัญตอน offboarding */}
              <div className="sm:col-span-2">
                <label className="label">ผู้มีสิทธิ์ admin (ติ๊กได้หลายคน)</label>
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-sand p-2 max-h-32 overflow-auto">
                  {employees.map((o) => {
                    const on = adminIds.includes(o.id);
                    return (
                      <button
                        type="button"
                        key={o.id}
                        onClick={() => toggleAdmin(o.id)}
                        className={`chip text-xs ${on ? "bg-brand-soft text-gold border border-brand" : "bg-sand text-muted"}`}
                      >
                        {on ? "✓ " : ""}{o.name}
                      </button>
                    );
                  })}
                  {employees.length === 0 && <span className="text-xs text-muted">ไม่มีรายชื่อพนักงาน</span>}
                </div>
              </div>

              <I label="สถานะ 2FA" v={f.twofa_status} on={(v) => set("twofa_status", v)} ph="เช่น เปิดแล้ว / ยังไม่เปิด" />
              <div>
                <label className="label">สถานะ</label>
                <select className="input" value={f.status} onChange={(ev) => set("status", ev.target.value)}>
                  <option value="active">ใช้งานอยู่</option>
                  <option value="inactive">พักไว้</option>
                </select>
              </div>
              <I label="อีเมลกู้คืน" v={f.recovery_email} on={(v) => set("recovery_email", v)} />
              <I label="เบอร์กู้คืน" v={f.recovery_phone} on={(v) => set("recovery_phone", v)} />
              <I label="อ้างอิง Password Manager" v={f.password_manager_ref} on={(v) => set("password_manager_ref", v)} ph="เช่น 1Password: Social" />
            </div>
            <div className="mt-4">
              <label className="label">หมายเหตุ</label>
              <textarea className="input" rows={2} value={f.note} onChange={(ev) => set("note", ev.target.value)} />
            </div>
            <p className="text-xs text-muted mt-2"><Icon name="ShieldAlert" className="size-3.5 inline text-amber" /> ห้ามเก็บรหัสผ่านตรง ๆ — ใส่แค่ลิงก์/อ้างอิง password manager · เปิด 2FA + ตั้งอีเมล/เบอร์กู้คืนทุกบัญชี</p>
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

function I({ label, v, on, ph }: { label: string; v: string; on: (v: string) => void; ph?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" placeholder={ph} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
