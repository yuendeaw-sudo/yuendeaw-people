"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatTHB, formatThaiDate } from "@/lib/utils";

type Opt = { id: string; name: string };
type RoleOpt = { id: string; name: string; key: string };

const STATUS: { v: string; label: string }[] = [
  { v: "active", label: "ทำงานอยู่" },
  { v: "probation", label: "ทดลองงาน" },
  { v: "inactive", label: "ไม่ได้ทำงานแล้ว" },
];
const WORK_MODE: { v: string; label: string }[] = [
  { v: "office", label: "เข้าออฟฟิศ" },
  { v: "remote", label: "รีโมท" },
  { v: "project", label: "ตามโปรเจกต์" },
];

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Icon name={icon} className="size-4 text-gold" /> {title}
      </h3>
      {children}
    </Card>
  );
}

export function EmployeeForm({
  mode,
  employee,
  options,
  currentRoleIds = [],
  compHistory = [],
  canSensitive,
  canAssignRoles,
}: {
  mode: "create" | "edit";
  employee?: any;
  options: { employmentTypes: Opt[]; departments: Opt[]; teams: Opt[]; managers: Opt[]; roles: RoleOpt[] };
  currentRoleIds?: string[];
  compHistory?: any[];
  canSensitive: boolean;
  canAssignRoles: boolean;
}) {
  const router = useRouter();
  const e = employee ?? {};
  const ec = e.emergency_contact ?? {};

  const [f, setF] = useState({
    first_name: e.first_name ?? "",
    last_name: e.last_name ?? "",
    nickname: e.nickname ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    employee_code: e.employee_code ?? "",
    employment_type_id: e.employment_type_id ?? "",
    department_id: e.department_id ?? "",
    team_id: e.team_id ?? "",
    manager_id: e.manager_id ?? "",
    position_title: e.position_title ?? "",
    work_mode: e.work_mode ?? "",
    start_date: e.start_date ?? "",
    probation_end_date: e.probation_end_date ?? "",
    status: e.status ?? "active",
    first_name_en: e.first_name_en ?? "",
    last_name_en: e.last_name_en ?? "",
    nickname_en: e.nickname_en ?? "",
    national_id: e.national_id ?? "",
    passport_no: e.passport_no ?? "",
    birth_date: e.birth_date ?? "",
    line_id: e.line_id ?? "",
    address: e.address ?? "",
    bank_name: e.bank_name ?? "",
    bank_account: e.bank_account ?? "",
    bank_account_type: e.bank_account_type ?? "",
    bank_branch: e.bank_branch ?? "",
    social_security: e.social_security ?? "enrolled",
    withholding_tax: e.withholding_tax ?? "",
    emergency_name: ec.name ?? "",
    emergency_phone: ec.phone ?? "",
    emergency_relation: ec.relation ?? "",
    notes: e.notes ?? "",
  });
  const [roleIds, setRoleIds] = useState<string[]>(currentRoleIds);
  const [comp, setComp] = useState({ comp_type: "monthly_salary", amount: "", effective_date: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF({ ...f, [k]: v });
  }
  function toggleRole(id: string) {
    setRoleIds((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.first_name.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const payload: any = {
      first_name: f.first_name.trim(),
      last_name: f.last_name || null,
      nickname: f.nickname || null,
      email: f.email || null,
      phone: f.phone || null,
      employee_code: f.employee_code || null,
      employment_type_id: f.employment_type_id || null,
      department_id: f.department_id || null,
      team_id: f.team_id || null,
      manager_id: f.manager_id || null,
      position_title: f.position_title || null,
      work_mode: f.work_mode || null,
      start_date: f.start_date || null,
      probation_end_date: f.probation_end_date || null,
      status: f.status,
      first_name_en: f.first_name_en || null,
      last_name_en: f.last_name_en || null,
      nickname_en: f.nickname_en || null,
      passport_no: f.passport_no || null,
      line_id: f.line_id || null,
      address: f.address || null,
      // sensitive — only written when the editor may see/edit sensitive data
      ...(canSensitive
        ? {
            national_id: f.national_id || null,
            birth_date: f.birth_date || null,
            bank_name: f.bank_name || null,
            bank_account: f.bank_account || null,
            bank_account_type: f.bank_account_type || null,
            bank_branch: f.bank_branch || null,
            social_security: f.social_security || "enrolled",
            withholding_tax: f.withholding_tax === "" ? null : Number(f.withholding_tax),
          }
        : {}),
      emergency_contact: {
        name: f.emergency_name || undefined,
        phone: f.emergency_phone || undefined,
        relation: f.emergency_relation || undefined,
      },
      notes: f.notes || null,
    };

    let empId = e.id as string | undefined;
    if (mode === "create") {
      const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
      if (error) return fail(error.message);
      empId = data.id;
    } else {
      const { error } = await supabase.from("employees").update(payload).eq("id", empId);
      if (error) return fail(error.message);
    }

    // sync roles
    if (canAssignRoles && empId) {
      const toAdd = roleIds.filter((r) => !currentRoleIds.includes(r));
      const toRemove = currentRoleIds.filter((r) => !roleIds.includes(r));
      if (toAdd.length) {
        const { error } = await supabase
          .from("employee_roles")
          .insert(toAdd.map((role_id) => ({ employee_id: empId, role_id })));
        if (error) return fail(error.message);
      }
      for (const role_id of toRemove) {
        await supabase.from("employee_roles").delete().eq("employee_id", empId).eq("role_id", role_id);
      }
    }

    // optional new compensation entry
    if (canSensitive && comp.amount && empId) {
      const { error } = await supabase.from("employee_compensation").insert({
        employee_id: empId,
        comp_type: comp.comp_type,
        amount: Number(comp.amount),
        effective_date: comp.effective_date || new Date().toISOString().slice(0, 10),
      });
      if (error) return fail(error.message);
    }

    router.push(`/people/${empId}`);
    router.refresh();

    function fail(msg: string) {
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="ข้อมูลทั่วไป" icon="IdCard">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="ชื่อ *" value={f.first_name} onChange={(v) => set("first_name", v)} required />
          <Input label="นามสกุล" value={f.last_name} onChange={(v) => set("last_name", v)} />
          <Input label="ชื่อเล่น" value={f.nickname} onChange={(v) => set("nickname", v)} />
          <Input label="รหัสพนักงาน" value={f.employee_code} onChange={(v) => set("employee_code", v)} />
          <Input label="ชื่อ (EN)" value={f.first_name_en} onChange={(v) => set("first_name_en", v)} />
          <Input label="นามสกุล (EN)" value={f.last_name_en} onChange={(v) => set("last_name_en", v)} />
          <Input label="ชื่อเล่น (EN)" value={f.nickname_en} onChange={(v) => set("nickname_en", v)} />
          <Input label="เลขหนังสือเดินทาง" value={f.passport_no} onChange={(v) => set("passport_no", v)} />
          {canSensitive && (
            <>
              <Input label="เลขบัตรประชาชน" value={f.national_id} onChange={(v) => set("national_id", v)} />
              <Input label="วันเกิด" type="date" value={f.birth_date} onChange={(v) => set("birth_date", v)} />
            </>
          )}
        </div>
      </Section>

      <Section title="ข้อมูลการติดต่อ" icon="Phone">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="อีเมล" type="email" value={f.email} onChange={(v) => set("email", v)} />
          <Input label="เบอร์โทร" value={f.phone} onChange={(v) => set("phone", v)} />
          <Input label="Line ID" value={f.line_id} onChange={(v) => set("line_id", v)} />
          <Input label="ที่อยู่" value={f.address} onChange={(v) => set("address", v)} />
        </div>
      </Section>

      <Section title="การจ้างงาน" icon="BriefcaseBusiness">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="รูปแบบการจ้างงาน" value={f.employment_type_id} onChange={(v) => set("employment_type_id", v)} options={options.employmentTypes} placeholder="— เลือก —" />
          <Select label="สถานะ" value={f.status} onChange={(v) => set("status", v)} options={STATUS.map((s) => ({ id: s.v, name: s.label }))} />
          <Input label="ตำแหน่ง" value={f.position_title} onChange={(v) => set("position_title", v)} />
          <Select label="รูปแบบการทำงาน" value={f.work_mode} onChange={(v) => set("work_mode", v)} options={WORK_MODE.map((s) => ({ id: s.v, name: s.label }))} placeholder="— เลือก —" />
          <Select label="ทีม" value={f.team_id} onChange={(v) => set("team_id", v)} options={options.teams} placeholder="— เลือก —" />
          <Select label="หัวหน้างาน" value={f.manager_id} onChange={(v) => set("manager_id", v)} options={options.managers} placeholder="— ไม่มี —" />
          <Input label="วันเริ่มงาน" type="date" value={f.start_date} onChange={(v) => set("start_date", v)} />
          <Input label="สิ้นสุดทดลองงาน" type="date" value={f.probation_end_date} onChange={(v) => set("probation_end_date", v)} />
        </div>
      </Section>

      {canAssignRoles && (
        <Section title="สิทธิ์การเข้าถึง (Roles)" icon="ShieldCheck">
          <div className="grid sm:grid-cols-3 gap-2">
            {options.roles.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition ${
                  roleIds.includes(r.id) ? "border-brand bg-brand-soft" : "border-sand bg-surface hover:bg-sand/40"
                }`}
              >
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">เลือกได้หลาย role — สิทธิ์จะรวมกัน (owner เห็นทุกอย่างอยู่แล้ว)</p>
        </Section>
      )}

      {canSensitive && (
        <Section title="ค่าตอบแทน (sensitive)" icon="Wallet">
          {compHistory.length > 0 && (
            <div className="space-y-2 mb-4">
              {compHistory.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-sand/40 px-3 py-2 text-sm">
                  <span className="font-semibold">{formatTHB(Number(c.amount))}</span>
                  <span className="text-muted text-xs">{c.comp_type} · ตั้งแต่ {formatThaiDate(c.effective_date)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mb-3">กรอกเพื่อ{compHistory.length ? "อัปเดต" : "เพิ่ม"}ค่าตอบแทนใหม่ (ระบบเก็บเป็นประวัติ)</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Select
              label="ประเภท"
              value={comp.comp_type}
              onChange={(v) => setComp({ ...comp, comp_type: v })}
              options={[
                { id: "monthly_salary", name: "เงินเดือน" },
                { id: "hourly", name: "รายชั่วโมง" },
                { id: "per_day", name: "รายวัน" },
                { id: "per_show", name: "ต่อโชว์" },
                { id: "project", name: "ต่อโปรเจกต์" },
              ]}
            />
            <Input label="จำนวนเงิน (บาท)" type="number" value={comp.amount} onChange={(v) => setComp({ ...comp, amount: v })} />
            <Input label="มีผลตั้งแต่" type="date" value={comp.effective_date} onChange={(v) => setComp({ ...comp, effective_date: v })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Select
              label="สิทธิ์ประกันสังคม"
              value={f.social_security}
              onChange={(v) => set("social_security", v)}
              options={[
                { id: "enrolled", name: "ขึ้นสิทธิ์ประกันสังคม" },
                { id: "not_enrolled", name: "ไม่ขึ้นประกันสังคม" },
              ]}
            />
            <Input
              label="หัก ณ ที่จ่าย / เดือน (บาท)"
              type="number"
              value={String(f.withholding_tax)}
              onChange={(v) => set("withholding_tax", v)}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            ประกันสังคมคำนวณอัตโนมัติ 5% ของเงินเดือน (สูงสุด 750 บาท/เดือน) · หัก ณ ที่จ่าย กรอกเองตามจริง
          </p>
        </Section>
      )}

      {canSensitive && (
        <Section title="ข้อมูลธนาคาร (sensitive)" icon="Landmark">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="ธนาคาร" value={f.bank_name} onChange={(v) => set("bank_name", v)} />
            <Input label="เลขที่บัญชี" value={f.bank_account} onChange={(v) => set("bank_account", v)} />
            <Input label="ประเภทบัญชี" value={f.bank_account_type} onChange={(v) => set("bank_account_type", v)} />
            <Input label="สาขา" value={f.bank_branch} onChange={(v) => set("bank_branch", v)} />
          </div>
        </Section>
      )}

      <Section title="ผู้ติดต่อฉุกเฉิน" icon="Phone">
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="ชื่อ" value={f.emergency_name} onChange={(v) => set("emergency_name", v)} />
          <Input label="เบอร์โทร" value={f.emergency_phone} onChange={(v) => set("emergency_phone", v)} />
          <Input label="ความสัมพันธ์" value={f.emergency_relation} onChange={(v) => set("emergency_relation", v)} />
        </div>
      </Section>

      {canSensitive && (
        <Section title="บันทึก HR (เฉพาะผู้มีสิทธิ์)" icon="StickyNote">
          <textarea className="input" rows={3} value={f.notes} onChange={(ev) => set("notes", ev.target.value)} />
        </Section>
      )}

      {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 sticky bottom-0 bg-paper/80 backdrop-blur py-3">
        <button type="submit" disabled={loading} className="btn-brand">
          <Icon name="Check" className="size-4" /> {loading ? "กำลังบันทึก…" : mode === "create" ? "เพิ่มพนักงาน" : "บันทึกการแก้ไข"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
