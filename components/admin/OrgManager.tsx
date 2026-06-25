"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Dept = { id: string; name: string };
type Team = { id: string; name: string; department_id: string | null };

export function OrgManager({ departments, teams }: { departments: Dept[]; teams: Team[] }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("");
  const [deptName, setDeptName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDept, setShowDept] = useState(departments.length > 0);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setBusy(true);
    await createClient().from("teams").insert({ name: teamName.trim(), department_id: teamDept || null });
    setTeamName("");
    setTeamDept("");
    setBusy(false);
    router.refresh();
  }

  async function removeTeam(id: string) {
    setBusy(true);
    await createClient().from("teams").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  async function addDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;
    setBusy(true);
    await createClient().from("departments").insert({ name: deptName.trim() });
    setDeptName("");
    setBusy(false);
    router.refresh();
  }

  const deptOf = (id: string | null) => departments.find((d) => d.id === id)?.name;

  return (
    <div className="space-y-5">
      {/* Teams — the primary unit for a flat org */}
      <div>
        <form onSubmit={addTeam} className="flex flex-wrap gap-2 mb-3">
          <input
            className="input flex-1 min-w-48"
            placeholder="ชื่อทีมใหม่ เช่น Content, Production, Creative"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          {showDept && departments.length > 0 && (
            <select className="input w-44" value={teamDept} onChange={(e) => setTeamDept(e.target.value)}>
              <option value="">— ไม่ผูกแผนก —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <button disabled={busy} className="btn-brand shrink-0">
            <Icon name="Plus" className="size-4" /> เพิ่มทีม
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {teams.length ? (
            teams.map((t) => (
              <span key={t.id} className="chip border border-sand group">
                <Icon name="Users" className="size-3.5" /> {t.name}
                {t.department_id && <span className="text-muted">· {deptOf(t.department_id)}</span>}
                <button
                  onClick={() => removeTeam(t.id)}
                  className="text-muted hover:text-rose ml-1"
                  title="ลบทีม"
                >
                  <Icon name="X" className="size-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">ยังไม่มีทีม — เพิ่มทีมแรกได้เลย</span>
          )}
        </div>
      </div>

      {/* Departments — optional, for orgs that group teams under departments */}
      <div className="border-t border-sand/60 pt-4">
        <button
          onClick={() => setShowDept((v) => !v)}
          className="text-xs text-muted hover:text-ink flex items-center gap-1"
        >
          <Icon name={showDept ? "ChevronUp" : "ChevronDown"} className="size-3.5" />
          ใช้แผนก (Department) ด้วย — สำหรับองค์กรที่จัดทีมเป็นกลุ่มแผนก
        </button>
        {showDept && (
          <div className="mt-3">
            <form onSubmit={addDept} className="flex gap-2 mb-3">
              <input
                className="input"
                placeholder="ชื่อแผนกใหม่"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
              />
              <button disabled={busy} className="btn-outline shrink-0">
                <Icon name="Plus" className="size-4" />
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {departments.length ? (
                departments.map((d) => (
                  <span key={d.id} className="chip border border-sand">
                    <Icon name="Building2" className="size-3.5" /> {d.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">ยังไม่มีแผนก (ไม่จำเป็นต้องมีก็ได้)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
