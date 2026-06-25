"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { questType, QUEST_STATUS, rewardKind, TIERS } from "@/lib/quests";

export function QuestCard({ q }: { q: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [p, setP] = useState({ percent: q.progress_percent ?? 0, metric: "", note: "", evidence: "" });

  const t = questType(q.type);
  const st = QUEST_STATUS[q.status] ?? { th: q.status, tone: "sand" };
  const reward = q.awarded_reward?.kind ? q.awarded_reward : q.requested_reward;

  async function setStatus(status: string, patch: any = {}) {
    setBusy(true);
    await createClient().from("quests").update({ status, ...patch }).eq("id", q.id);
    setBusy(false);
    router.refresh();
  }

  async function saveProgress() {
    setBusy(true);
    const sb = createClient();
    await sb.from("quest_updates").insert({
      quest_id: q.id,
      percent: Number(p.percent),
      metric: p.metric || null,
      note: p.note || null,
      evidence_url: p.evidence || null,
    });
    await sb.from("quests").update({ progress_percent: Number(p.percent), latest_metric: p.metric || q.latest_metric }).eq("id", q.id);
    setBusy(false);
    setOpen(false);
    setP({ ...p, metric: "", note: "", evidence: "" });
    router.refresh();
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{t.emoji}</span>
          <Badge tone={t.tone}>{t.th}</Badge>
        </div>
        <Badge tone={st.tone}>{st.th}</Badge>
      </div>

      <h3 className="font-bold mt-2">{q.title}</h3>
      {q.target && <p className="text-sm text-muted mt-1">{q.target}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-2">
        {(q.start_date || q.end_date) && <span>{formatThaiDate(q.start_date)} – {formatThaiDate(q.end_date)}</span>}
        {reward?.kind && (
          <span className="text-gold font-medium">
            🎁 {rewardKind(reward.kind).emoji} {reward.cash ? formatTHB(reward.cash) : reward.detail || rewardKind(reward.kind).th}
          </span>
        )}
      </div>

      {/* progress bar (in progress / review / completed) */}
      {["in_progress", "submitted_for_review", "completed"].includes(q.status) && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">ความคืบหน้า</span>
            <span className="font-semibold">{q.progress_percent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-sand overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, q.progress_percent)}%` }} />
          </div>
          {q.latest_metric && <p className="text-xs text-muted mt-1">ล่าสุด: {q.latest_metric}</p>}
        </div>
      )}

      {/* owner note / adjustment */}
      {q.owner_note && ["needs_revision", "awaiting_employee"].includes(q.status) && (
        <div className="mt-3 rounded-xl bg-amber-soft/50 p-3 text-sm">
          <div className="font-semibold text-[#9a6b06] mb-0.5">ข้อความจาก Owner</div>
          {q.owner_note}
        </div>
      )}

      {/* completed result */}
      {q.status === "completed" && (
        <div className="mt-3 rounded-xl2 bg-mint-soft/50 p-3 flex flex-wrap items-center gap-3 text-sm">
          {q.awarded_badge_name && (
            <span className="font-semibold">{TIERS[q.awarded_tier]?.emoji} {q.awarded_badge_name}</span>
          )}
          <span className="font-semibold">+{q.performance_points} แต้ม</span>
          {reward?.kind && <span>{rewardKind(reward.kind).emoji} {reward.cash ? formatTHB(reward.cash) : reward.detail}</span>}
        </div>
      )}

      {/* actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {q.status === "draft" && (
          <button onClick={() => setStatus("submitted")} disabled={busy} className="btn-brand text-xs px-3 py-1.5">ส่งให้ Owner</button>
        )}
        {q.status === "needs_revision" && (
          <button onClick={() => setStatus("submitted")} disabled={busy} className="btn-brand text-xs px-3 py-1.5">ส่งใหม่</button>
        )}
        {q.status === "awaiting_employee" && (
          <>
            <button onClick={() => setStatus("in_progress", { employee_confirmed: true })} disabled={busy} className="btn-brand text-xs px-3 py-1.5">
              <Icon name="Check" className="size-3.5" /> ยอมรับเงื่อนไข เริ่มเลย
            </button>
            <button onClick={() => setStatus("needs_revision")} disabled={busy} className="btn-ghost text-xs px-3 py-1.5">ขอคุยใหม่</button>
          </>
        )}
        {q.status === "in_progress" && (
          <>
            <button onClick={() => setOpen((o) => !o)} className="btn-outline text-xs px-3 py-1.5">
              <Icon name="TrendingUp" className="size-3.5" /> อัปเดตความคืบหน้า
            </button>
            <button onClick={() => setStatus("submitted_for_review")} disabled={busy} className="btn-brand text-xs px-3 py-1.5">ส่งผลงานให้ตรวจ</button>
          </>
        )}
      </div>

      {/* inline progress update */}
      {open && q.status === "in_progress" && (
        <div className="mt-3 rounded-xl bg-sand/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} value={p.percent} onChange={(e) => setP({ ...p, percent: Number(e.target.value) })} className="flex-1" />
            <span className="text-sm font-bold w-10 text-right">{p.percent}%</span>
          </div>
          <input className="input" placeholder="ตัวเลขล่าสุด เช่น 14M views" value={p.metric} onChange={(e) => setP({ ...p, metric: e.target.value })} />
          <input className="input" placeholder="โน้ต (ถ้ามี)" value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} />
          <input className="input" placeholder="ลิงก์หลักฐาน (ถ้ามี)" value={p.evidence} onChange={(e) => setP({ ...p, evidence: e.target.value })} />
          <button onClick={saveProgress} disabled={busy} className="btn-brand text-xs px-3 py-1.5 w-full">บันทึกความคืบหน้า</button>
        </div>
      )}
    </div>
  );
}
