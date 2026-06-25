"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Dept = { id: string; name: string };
type Team = { id: string; name: string; department_id: string | null };

export function OrgManager({ departments, teams }: { departments: Dept[]; teams: Team[] }) {
  const router = useRouter();
  const [deptName, setDeptName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("");
  const [busy, setBusy] = useState(false);

  async function addDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("departments").insert({ name: deptName.trim() });
    setDeptName("");
    setBusy(false);
    router.refresh();
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("teams").insert({ name: teamName.trim(), department_id: teamDept || null });
    setTeamName("");
    setTeamDept("");
    setBusy(false);
    router.refresh();
  }

  const deptName_ = (id: string | null) => departments.find((d) => d.id === id)?.name;

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <div>
        <form onSubmit={addDept} className="flex gap-2 mb-3">
          <input className="input" placeholder="ชื่อแผนกใหม่" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
          <button disabled={busy} className="btn-brand shrink-0">
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
            <span className="text-xs text-muted">ยังไม่มีแผนก</span>
          )}
        </div>
      </div>

      <div>
        <form onSubmit={addTeam} className="space-y-2 mb-3">
          <div className="flex gap-2">
            <input className="input" placeholder="ชื่อทีมใหม่" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <button disabled={busy} className="btn-brand shrink-0">
              <Icon name="Plus" className="size-4" />
            </button>
          </div>
          <select className="input" value={teamDept} onChange={(e) => setTeamDept(e.target.value)}>
            <option value="">— ไม่ผูกแผนก —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </form>
        <div className="flex flex-wrap gap-2">
          {teams.length ? (
            teams.map((t) => (
              <span key={t.id} className="chip border border-sand">
                <Icon name="Users" className="size-3.5" /> {t.name}
                {t.department_id && <span className="text-muted">· {deptName_(t.department_id)}</span>}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">ยังไม่มีทีม</span>
          )}
        </div>
      </div>
    </div>
  );
}
