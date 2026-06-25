"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_LEVELS,
  INCIDENT_STATUS,
  CORRECTIVE_ACTIONS,
} from "@/lib/phase2-labels";

export function IncidentRow({ inc, canEdit }: { inc: any; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(inc.decision ?? "");
  const [caType, setCaType] = useState("coaching");
  const [caDetail, setCaDetail] = useState("");

  const lvl = INCIDENT_LEVELS.find((l) => l.v === inc.level) ?? INCIDENT_LEVELS[0];
  const st = INCIDENT_STATUS[inc.status] ?? { label: inc.status, tone: "sand" };
  const cat = INCIDENT_CATEGORIES.find((c) => c.v === inc.category)?.label ?? inc.category;
  const emp = inc.employees;

  async function setStatus(status: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("incidents").update({ status, decision: decision || null }).eq("id", inc.id);
    setBusy(false);
    router.refresh();
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault();
    if (!caType) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("corrective_actions").insert({
      incident_id: inc.id,
      action_type: caType,
      details: caDetail || null,
    });
    setCaDetail("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-sand bg-surface">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        <Badge tone={lvl.tone}>L{inc.level} {lvl.label}</Badge>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{inc.title}</div>
          <div className="text-xs text-muted truncate">
            {emp?.nickname || emp?.first_name} · {cat} · {formatThaiDate(inc.created_at)}
          </div>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} className="size-4 text-muted" />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-sand/70 space-y-4">
          {inc.description && <p className="text-sm text-ink/80 whitespace-pre-wrap">{inc.description}</p>}

          {inc.corrective_actions?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted mb-1.5">บทลงโทษ / การแก้ไข</div>
              <div className="space-y-1.5">
                {inc.corrective_actions.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm rounded-lg bg-sand/40 px-3 py-2">
                    <Icon name="Gavel" className="size-3.5 text-rose" />
                    <span className="font-medium">
                      {CORRECTIVE_ACTIONS.find((c) => c.v === a.action_type)?.label ?? a.action_type}
                    </span>
                    {a.details && <span className="text-muted text-xs">— {a.details}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="label text-xs">ผลการตัดสิน / บันทึก</label>
                <textarea className="input" rows={2} value={decision} onChange={(e) => setDecision(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {["hr_review", "awaiting_explanation", "decided", "closed"].map((s) => (
                  <button key={s} onClick={() => setStatus(s)} disabled={busy} className="btn-outline text-xs px-3 py-1.5">
                    {INCIDENT_STATUS[s].label}
                  </button>
                ))}
              </div>

              <form onSubmit={addAction} className="flex flex-wrap items-end gap-2 pt-2 border-t border-sand/70">
                <div className="flex-1 min-w-[140px]">
                  <label className="label text-xs">เพิ่มบทลงโทษ</label>
                  <select className="input" value={caType} onChange={(e) => setCaType(e.target.value)}>
                    {CORRECTIVE_ACTIONS.map((c) => (
                      <option key={c.v} value={c.v}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <input className="input flex-1 min-w-[140px]" placeholder="รายละเอียด (ถ้ามี)" value={caDetail} onChange={(e) => setCaDetail(e.target.value)} />
                <button disabled={busy} className="btn-ghost shrink-0">
                  <Icon name="Plus" className="size-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
