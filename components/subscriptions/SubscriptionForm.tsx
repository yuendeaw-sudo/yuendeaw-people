"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { toCE } from "@/lib/utils";
import { CURRENCIES, toTHB } from "@/lib/subscriptions";

type Opt = { id: string; name: string };
type Account = { id: string; label: string; email: string | null };
type PM = { id: string; label: string; last4: string | null };

const NEW = "__new__";

export function SubscriptionForm({
  existing,
  employees,
  teams,
  accounts,
  paymentMethods,
  defaultAccountId,
}: {
  existing?: any;
  employees: Opt[];
  teams: Opt[];
  accounts: Account[];
  paymentMethods: PM[];
  defaultAccountId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const e = existing ?? {};
  const [f, setF] = useState({
    service_name: e.service_name ?? "",
    account_id: e.account_id ?? defaultAccountId ?? "",
    owner_id: e.owner_id ?? "",
    team_id: e.team_id ?? "",
    cost: e.cost ?? "",
    currency: e.currency ?? "THB",
    billing_cycle: e.billing_cycle ?? "monthly",
    billing_date: e.billing_date ?? "",
    renewal_date: e.renewal_date ?? "",
    status: e.status ?? "active",
    purpose: e.purpose ?? "",
    twofa_status: e.twofa_status ?? "",
    payment_method_id: e.payment_method_id ?? "",
    password_manager_ref: e.password_manager_ref ?? "",
    note: e.note ?? "",
  });
  // inline-create บัญชีล็อกอินใหม่
  const [newAcct, setNewAcct] = useState({ label: "", email: "" });
  // inline-create บัตรใหม่ (เก็บแค่ 4 ตัวท้าย)
  const [newPm, setNewPm] = useState({ label: "", holder: "", last4: "", brand: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.service_name.trim()) return setError("ใส่ชื่อบริการก่อน");
    setBusy(true);
    setError(null);
    const sb = createClient();

    try {
      // 1) บัญชีล็อกอิน (สร้างใหม่ถ้าเลือก "เพิ่มบัญชีใหม่")
      let accountId: string | null = f.account_id || null;
      let accountEmail: string | null = accounts.find((a) => a.id === f.account_id)?.email ?? null;
      if (f.account_id === NEW) {
        if (!newAcct.label.trim() && !newAcct.email.trim()) {
          setBusy(false);
          return setError("ใส่ชื่อ/อีเมลบัญชีใหม่ก่อน");
        }
        const { data, error } = await sb
          .from("subscription_accounts")
          .insert({
            label: newAcct.label.trim() || newAcct.email.trim(),
            email: newAcct.email.trim() || null,
            kind: "gsuite",
          })
          .select("id, email")
          .single();
        if (error) { setBusy(false); return setError(error.message); }
        accountId = data.id;
        accountEmail = data.email;
      }

      // 2) วิธีจ่ายเงิน (สร้างใหม่ถ้าเลือก "เพิ่มบัตรใหม่") — เก็บแค่ 4 ตัวท้าย
      let pmId: string | null = f.payment_method_id || null;
      if (f.payment_method_id === NEW) {
        if (!newPm.label.trim()) { setBusy(false); return setError("ใส่ชื่อบัตรก่อน"); }
        const last4 = newPm.last4.replace(/\D/g, "").slice(-4);
        const { data, error } = await sb
          .from("payment_methods")
          .insert({
            label: newPm.label.trim(),
            holder_name: newPm.holder.trim() || null,
            last4: last4 || null,
            brand: newPm.brand.trim() || null,
          })
          .select("id")
          .single();
        if (error) { setBusy(false); return setError(error.message); }
        pmId = data.id;
      }

      const payload: any = {
        service_name: f.service_name.trim(),
        account_id: accountId,
        account_email: accountEmail, // denormalized สำหรับแสดงผล
        owner_id: f.owner_id || null,
        team_id: f.team_id || null,
        cost: f.cost ? Number(f.cost) : null,
        currency: f.currency,
        billing_cycle: f.billing_cycle,
        billing_date: f.billing_date ? toCE(f.billing_date) : null,
        renewal_date: f.renewal_date ? toCE(f.renewal_date) : null,
        status: f.status,
        purpose: f.purpose || null,
        twofa_status: f.twofa_status || null,
        payment_method_id: pmId,
        password_manager_ref: f.password_manager_ref || null,
        note: f.note || null,
      };
      const { error } = existing
        ? await sb.from("subscriptions").update(payload).eq("id", existing.id)
        : await sb.from("subscriptions").insert(payload);
      setBusy(false);
      if (error) return setError(error.message);
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || "บันทึกไม่สำเร็จ");
    }
  }

  async function remove() {
    if (!confirm("ลบ subscription นี้?")) return;
    setBusy(true);
    await createClient().from("subscriptions").delete().eq("id", existing.id);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  const costTHB = f.cost ? Math.round(toTHB(Number(f.cost), f.currency)) : 0;

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
              <I label="ชื่อบริการ *" v={f.service_name} on={(v) => set("service_name", v)} ph="เช่น Adobe, OpenAI, Envato" />

              {/* บัญชีล็อกอิน (GSuite) */}
              <div>
                <label className="label">บัญชีล็อกอิน (GSuite)</label>
                <select className="input" value={f.account_id} onChange={(ev) => set("account_id", ev.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}{a.email && a.label !== a.email ? ` · ${a.email}` : ""}</option>
                  ))}
                  <option value={NEW}>➕ เพิ่มบัญชีใหม่…</option>
                </select>
              </div>

              {f.account_id === NEW && (
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 rounded-xl bg-sand/40 p-3">
                  <I label="ชื่อบัญชีใหม่" v={newAcct.label} on={(v) => setNewAcct((s) => ({ ...s, label: v }))} ph="เช่น marketing@..." />
                  <I label="อีเมลบัญชี" v={newAcct.email} on={(v) => setNewAcct((s) => ({ ...s, email: v }))} ph="you@domain.com" />
                </div>
              )}

              {/* ค่าใช้จ่าย + สกุลเงิน */}
              <div>
                <label className="label">ค่าใช้จ่าย</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" className="input flex-1" value={f.cost} onChange={(ev) => set("cost", ev.target.value)} />
                  <select className="input w-28" value={f.currency} onChange={(ev) => set("currency", ev.target.value)}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                {f.currency === "USD" && f.cost ? (
                  <p className="text-[11px] text-muted mt-1">≈ ฿{costTHB.toLocaleString()} (เรตโดยประมาณ)</p>
                ) : null}
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
                <input type="date" className="input" value={f.billing_date} onChange={(ev) => set("billing_date", ev.target.value)} />
              </div>
              <div>
                <label className="label">วันต่ออายุ</label>
                <input type="date" className="input" value={f.renewal_date} onChange={(ev) => set("renewal_date", ev.target.value)} />
              </div>

              <Sel label="ผู้ดูแล" v={f.owner_id} on={(v) => set("owner_id", v)} opts={employees} ph="— เลือก —" />
              <Sel label="ทีม/โปรเจกต์" v={f.team_id} on={(v) => set("team_id", v)} opts={teams} ph="— เลือก —" />

              {/* วิธีจ่ายเงิน */}
              <div className="sm:col-span-2">
                <label className="label">วิธีจ่ายเงิน (บัตรเครดิต)</label>
                <select className="input" value={f.payment_method_id} onChange={(ev) => set("payment_method_id", ev.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}{p.last4 ? ` ····${p.last4}` : ""}</option>
                  ))}
                  <option value={NEW}>➕ เพิ่มบัตรใหม่…</option>
                </select>
              </div>

              {f.payment_method_id === NEW && (
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 rounded-xl bg-sand/40 p-3">
                  <I label="ชื่อเล่นบัตร *" v={newPm.label} on={(v) => setNewPm((s) => ({ ...s, label: v }))} ph="เช่น บัตร KBank บริษัท" />
                  <I label="ชื่อบนบัตร" v={newPm.holder} on={(v) => setNewPm((s) => ({ ...s, holder: v }))} />
                  <div>
                    <label className="label">4 ตัวท้าย</label>
                    <input className="input" inputMode="numeric" maxLength={4} value={newPm.last4} onChange={(ev) => setNewPm((s) => ({ ...s, last4: ev.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="1234" />
                  </div>
                  <I label="ประเภทบัตร" v={newPm.brand} on={(v) => setNewPm((s) => ({ ...s, brand: v }))} ph="Visa / Mastercard" />
                  <p className="sm:col-span-2 text-[11px] text-amber flex items-start gap-1.5">
                    <Icon name="ShieldAlert" className="size-3.5 shrink-0 mt-0.5" />
                    เพื่อความปลอดภัย เก็บแค่ชื่อบัตร + 4 ตัวท้าย — ห้ามกรอกเลขบัตรเต็ม
                  </p>
                </div>
              )}

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
            <p className="text-xs text-muted mt-2"><Icon name="ShieldAlert" className="size-3.5 inline text-amber" /> ห้ามเก็บรหัสผ่าน/เลขบัตรเต็ม — ใส่แค่ลิงก์/อ้างอิง password manager และ 4 ตัวท้ายบัตร</p>
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
