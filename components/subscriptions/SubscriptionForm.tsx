"use client";

import { toCE } from "@/lib/utils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Opt = { id: string; name: string };

export function SubscriptionForm({
  existing,
  employees,
  teams,
}: {
  existing?: any;
  employees: Opt[];
  teams: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const e = existing ?? {};
  const [f, setF] = useState({
    service_name: e.service_name ?? "",
    account_email: e.account_email ?? "",
    owner_id: e.owner_id ?? "",
    team_id: e.team_id ?? "",
    cost: e.cost ?? "",
    billing_cycle: e.billing_cycle ?? "monthly",
    billing_date: e.billing_date ?? "",
    renewal_date: e.renewal_date ?? "",
    status: e.status ?? "active",
    purpose: e.purpose ?? "",
    twofa_status: e.twofa_status ?? "",
    password_manager_ref: e.password_manager_ref ?? "",
    note: e.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.service_name.trim()) {
      setError("ใส่ชื่อบริการก่อน");
      return;
    }
    setBusy(true);
    setError(null);
    const payload: any = {
      service_name: f.service_name.trim(),
      account_email: f.account_email || null,
      owner_id: f.owner_id || null,
      team_id: f.team_id || null,
      cost: f.cost ? Number(f.cost) : null,
      billing_cycle: f.billing_cycle,
      billing_date: f.billing_date || null,
      renewal_date: f.renewal_date || null,
      status: f.status,
      purpose: f.purpose || null,
      twofa_status: f.twofa_status || null,
      password_manager_ref: f.password_manager_ref || null,
      note: f.note || null,
    };
    const sb = createClient();
    const { error } = existing
      ? await sb.from("subscriptions").update(payload).eq("id", existing.id)
      : await sb.from("subscriptions").insert(payload);
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("ลบ subscription นี้?")) return;
    setBusy(true);
    await createClient().from("subscriptions").delete().eq("id", existing.id);
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
          <Icon name="Plus" className="size-4" /> เพิ่ม Subscription
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{existing ? "แก้ไข Subscription" : "เพิ่ม Subscription"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <Icon name="X" className="size-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <I label="ชื่อบริการ *" v={f.service_name} on={(v) => set("service_name", v)} ph="เช่น Google Workspace, Adobe, OpenAI" />
              <I label="อีเมลบัญชี" v={f.account_email} on={(v) => set("account_email", v)} />
              <div>
                <label className="label">ค่าใช้จ่าย (บาท)</label>
                <input type="number" className="input" value={f.cost} onChange={(ev) => set("cost", ev.target.value)} />
              </div>
              <div>
                <label className="label">รอบบิล</label>
                <select className="input" value={f.billing_cycle} onChange={(ev) => set("billing_cycle", ev.target.value)}>
                  <option value="monthly">รายเดือน</option>
                  <option value="yearly">รายปี</option>
                </select>
              </div>
              <div>
                <label className="label">วันที่เรียกเก็บ</label>
                <input type="date" className="input" value={f.billing_date} onChange={(ev) => set("billing_date", toCE(ev.target.value))} />
              </div>
              <div>
                <label className="label">วันต่ออายุ</label>
                <input type="date" className="input" value={f.renewal_date} onChange={(ev) => set("renewal_date", toCE(ev.target.value))} />
              </div>
              <Sel label="ผู้ดูแล" v={f.owner_id} on={(v) => set("owner_id", v)} opts={employees} ph="— เลือก —" />
              <Sel label="ทีม/โปรเจกต์" v={f.team_id} on={(v) => set("team_id", v)} opts={teams} ph="— เลือก —" />
              <div>
                <label className="label">สถานะ</label>
                <select className="input" value={f.status} onChange={(ev) => set("status", ev.target.value)}>
                  <option value="active">ใช้งานอยู่</option>
                  <option value="trial">ทดลอง</option>
                  <option value="cancelled">ยกเลิกแล้ว</option>
                </select>
              </div>
              <I label="สถานะ 2FA" v={f.twofa_status} on={(v) => set("twofa_status", v)} ph="เช่น เปิดแล้ว / ยังไม่เปิด" />
              <I label="วัตถุประสงค์" v={f.purpose} on={(v) => set("purpose", v)} />
              <I label="อ้างอิง Password Manager" v={f.password_manager_ref} on={(v) => set("password_manager_ref", v)} ph="เช่น 1Password vault: Tools" />
            </div>
            <div className="mt-4">
              <label className="label">หมายเหตุ</label>
              <textarea className="input" rows={2} value={f.note} onChange={(ev) => set("note", ev.target.value)} />
            </div>
            <p className="text-xs text-muted mt-2"><Icon name="ShieldAlert" className="size-3.5 inline text-amber" /> ห้ามเก็บรหัสผ่านตรง ๆ — ใส่แค่ลิงก์/อ้างอิง password manager</p>
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
function Sel({ label, v, on, opts, ph }: { label: string; v: string; on: (v: string) => void; opts: Opt[]; ph?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={v} onChange={(e) => on(e.target.value)}>
        {ph && <option value="">{ph}</option>}
        {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
