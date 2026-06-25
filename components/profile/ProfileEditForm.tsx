"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

type EC = { name?: string; phone?: string; relation?: string };

export function ProfileEditForm({
  phone,
  lineId,
  address,
  emergency,
}: {
  phone: string | null;
  lineId: string | null;
  address: string | null;
  emergency: EC | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({
    phone: phone || "",
    line_id: lineId || "",
    address: address || "",
    ec_name: emergency?.name || "",
    ec_phone: emergency?.phone || "",
    ec_relation: emergency?.relation || "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: f.phone,
          line_id: f.line_id,
          address: f.address,
          emergency_contact: { name: f.ec_name, phone: f.ec_phone, relation: f.ec_relation },
        }),
      });
      if (!r.ok) {
        setErr((await r.text()) || "บันทึกไม่สำเร็จ");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setErr("บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Icon name="Contact" className="size-4 text-grape" /> ข้อมูลติดต่อของฉัน
          </h3>
          <button onClick={() => setEditing(true)} className="btn-outline !py-1.5 !px-3 text-sm">
            <Icon name="Pencil" className="size-3.5" /> แก้ไข
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <View label="เบอร์โทร" value={f.phone} />
          <View label="Line ID" value={f.line_id} />
          <View label="ที่อยู่" value={f.address} full />
          <View label="ผู้ติดต่อฉุกเฉิน" value={f.ec_name} />
          <View label="เบอร์ฉุกเฉิน" value={f.ec_phone} />
          <View label="ความสัมพันธ์" value={f.ec_relation} />
        </div>
        <p className="text-[11px] text-muted mt-3">
          การแก้ไขจะถูกบันทึกไว้ให้ HR ตรวจสอบ
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Icon name="Contact" className="size-4 text-grape" /> แก้ไขข้อมูลติดต่อ
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="เบอร์โทร" value={f.phone} onChange={(v) => set("phone", v)} />
        <Field label="Line ID" value={f.line_id} onChange={(v) => set("line_id", v)} />
        <div className="col-span-2">
          <label className="label">ที่อยู่</label>
          <textarea className="input min-h-20" value={f.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="col-span-2 mt-1 text-xs font-semibold text-muted">ผู้ติดต่อฉุกเฉิน</div>
        <Field label="ชื่อ" value={f.ec_name} onChange={(v) => set("ec_name", v)} />
        <Field label="เบอร์โทร" value={f.ec_phone} onChange={(v) => set("ec_phone", v)} />
        <Field label="ความสัมพันธ์" value={f.ec_relation} onChange={(v) => set("ec_relation", v)} />
      </div>

      {err && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2 mt-3">{err}</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={busy} className="btn-brand">
          <Icon name="Check" className="size-4" /> {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button onClick={() => setEditing(false)} disabled={busy} className="btn-outline">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

function View({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
