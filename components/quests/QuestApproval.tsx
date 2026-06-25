"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { notifyEmployee } from "@/lib/notify";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import {
  questType, QUEST_STATUS, rewardKind, REWARD_KINDS, TIERS, COMPLETION,
  computeBase, performancePoints, suggestTier,
} from "@/lib/quests";

export function QuestApproval({ q, badges = [] }: { q: any; badges?: { name: string; tier: string }[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "approve" | "complete">(null);
  const [busy, setBusy] = useState(false);

  const t = questType(q.type);
  const st = QUEST_STATUS[q.status] ?? { th: q.status, tone: "sand" };
  const emp = q.employees;

  // approve form — Owner assigns the reward
  const [diff, setDiff] = useState(2);
  const [impact, setImpact] = useState(2);
  const [evi, setEvi] = useState(2);
  const [note, setNote] = useState("");
  const [adjTarget, setAdjTarget] = useState(q.target ?? "");
  const [rwKind, setRwKind] = useState("cash");
  const [rwDetail, setRwDetail] = useState("");
  const [rwCash, setRwCash] = useState("");
  const base = computeBase(q.type, diff, impact, evi);

  // complete form — Owner assigns the badge
  const [completion, setCompletion] = useState("met");
  const [tier, setTier] = useState("silver");
  const [badgeName, setBadgeName] = useState("");
  const points = performancePoints(q.base_points ?? base, completion);

  async function update(patch: any) {
    setBusy(true);
    const { data: au } = await createClient().auth.getUser();
    await createClient().from("quests").update({ reviewed_by: au.user?.id ?? null, ...patch }).eq("id", q.id);
    setBusy(false);
    setMode(null);
    router.refresh();
  }

  async function approve() {
    // Owner assigns the reward; only a change to the employee's target needs re-confirm
    const targetChanged = adjTarget.trim() !== (q.target ?? "").trim();
    const reward = { kind: rwKind, detail: rwDetail || null, cash: rwCash ? Number(rwCash) : null };
    await update({
      difficulty: diff, business_impact: impact, evidence_quality: evi, base_points: base,
      target: adjTarget || q.target, owner_note: note || null, awarded_reward: reward,
      status: targetChanged ? "awaiting_employee" : "in_progress",
      employee_confirmed: targetChanged ? false : true,
    });
    await notifyEmployee(q.employee_id, {
      title: targetChanged ? "Owner ปรับเป้าหมายภารกิจ — รอคุณยืนยัน" : "ภารกิจได้รับอนุมัติ เริ่มได้เลย 🚀",
      body: q.title,
      link: "/quests",
      kind: "quest",
    });
  }

  async function complete() {
    const name = badgeName.trim();
    await update({
      status: "completed", completion_rate: completion, performance_points: points,
      awarded_badge_name: name || null, awarded_tier: name ? tier : null,
      reward_status: "approved",
    });
    if (name) {
      await createClient().from("employee_badges").insert({
        employee_id: q.employee_id, badge_name: name, tier, quest_id: q.id, points,
      });
    }
    await notifyEmployee(q.employee_id, {
      title: `ภารกิจสำเร็จ 🎉 ได้ ${points} แต้ม${name ? ` + Badge ${name}` : ""}`,
      body: q.title,
      link: "/quests",
      kind: "quest",
    });
    router.refresh();
  }

  const Pick = ({ n, val, set, labels }: { n: number; val: number; set: (v: number) => void; labels: string[] }) => (
    <div className="flex gap-1">
      {Array.from({ length: n }, (_, i) => i + 1).map((v) => (
        <button key={v} type="button" onClick={() => set(v)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${val === v ? "bg-brand text-ink" : "bg-sand/60 text-muted"}`}>
          {labels[v - 1]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={emp?.nickname || emp?.first_name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{emp?.nickname || emp?.first_name}</span>
            <span>{t.emoji}</span>
            <Badge tone={t.tone}>{t.th}</Badge>
            <Badge tone={st.tone}>{st.th}</Badge>
          </div>
          <h3 className="font-bold mt-1">{q.title}</h3>
          {q.target && <p className="text-sm text-muted mt-0.5">🎯 {q.target}</p>}
          {q.why_important && <p className="text-sm text-muted mt-0.5">💡 {q.why_important}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1.5">
            {(q.start_date || q.end_date) && <span>{formatThaiDate(q.start_date)} – {formatThaiDate(q.end_date)}</span>}
            {q.awarded_reward?.kind && (
              <span className="text-gold font-medium">
                🎁 {rewardKind(q.awarded_reward.kind).emoji} {q.awarded_reward.cash ? formatTHB(q.awarded_reward.cash) : q.awarded_reward.detail || rewardKind(q.awarded_reward.kind).th}
              </span>
            )}
            {q.base_points != null && <span>น้ำหนัก {q.base_points} แต้ม</span>}
            {q.progress_percent > 0 && <span>คืบหน้า {q.progress_percent}%</span>}
          </div>
        </div>
      </div>

      {/* action triggers */}
      <div className="mt-3 flex flex-wrap gap-2">
        {["submitted", "needs_revision"].includes(q.status) && (
          <>
            <button onClick={() => setMode("approve")} className="btn-brand text-xs px-3 py-1.5"><Icon name="Check" className="size-3.5" /> ตรวจ & อนุมัติ</button>
            <button onClick={() => update({ status: "needs_revision", owner_note: "ขอปรับรายละเอียดเพิ่ม" })} disabled={busy} className="btn-ghost text-xs px-3 py-1.5">ขอแก้ไข</button>
            <button onClick={() => update({ status: "cancelled" })} disabled={busy} className="btn text-xs px-3 py-1.5 bg-rose-soft text-rose">ปฏิเสธ</button>
          </>
        )}
        {q.status === "submitted_for_review" && (
          <>
            <button onClick={() => { setTier(suggestTier(completion, impact)); setMode("complete"); }} className="btn-brand text-xs px-3 py-1.5"><Icon name="Trophy" className="size-3.5" /> ปิดภารกิจ & ให้รางวัล</button>
            <button onClick={() => update({ status: "failed" })} disabled={busy} className="btn text-xs px-3 py-1.5 bg-rose-soft text-rose">ไม่สำเร็จ</button>
            <button onClick={() => update({ status: "in_progress", owner_note: "ขอหลักฐานเพิ่ม" })} disabled={busy} className="btn-ghost text-xs px-3 py-1.5">ขอหลักฐานเพิ่ม</button>
          </>
        )}
      </div>

      {/* APPROVE modal */}
      {mode === "approve" && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMode(null)} />
          <div className="relative card p-6 w-full max-w-lg my-8 space-y-4">
            <h3 className="font-bold text-lg">ตรวจ & ให้น้ำหนักภารกิจ</h3>
            <div className="space-y-2.5">
              <div><div className="label">ความยาก</div><Pick n={4} val={diff} set={setDiff} labels={["ง่าย", "กลาง", "ยาก", "ยากมาก"]} /></div>
              <div><div className="label">ผลต่อธุรกิจ</div><Pick n={4} val={impact} set={setImpact} labels={["ต่ำ", "กลาง", "สูง", "สูงมาก"]} /></div>
              <div><div className="label">วัดผลได้ชัด</div><Pick n={3} val={evi} set={setEvi} labels={["ยาก", "พอได้", "ชัดเจน"]} /></div>
            </div>
            <div className="rounded-xl bg-brand-soft p-3 text-sm">น้ำหนักภารกิจ ≈ <b className="text-lg">{base}</b> แต้ม (คะแนนจริงคูณตอนปิดภารกิจ)</div>
            <div>
              <div className="label">ปรับเป้าหมาย (ถ้าต้องการ)</div>
              <textarea className="input" rows={2} value={adjTarget} onChange={(e) => setAdjTarget(e.target.value)} />
            </div>
            <div>
              <div className="label">รางวัลที่จะมอบ (Owner กำหนด)</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <select className="input" value={rwKind} onChange={(e) => setRwKind(e.target.value)}>
                  {REWARD_KINDS.map((r) => <option key={r.key} value={r.key}>{r.emoji} {r.th}</option>)}
                </select>
                <input className="input" placeholder="รายละเอียดรางวัล" value={rwDetail} onChange={(e) => setRwDetail(e.target.value)} />
                {rwKind === "cash" && <input type="number" className="input" placeholder="บาท" value={rwCash} onChange={(e) => setRwCash(e.target.value)} />}
              </div>
            </div>
            <textarea className="input" rows={2} placeholder="ข้อความถึงพนักงาน (เช่น เงื่อนไขเพิ่ม)" value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-xs text-muted">ถ้าปรับเป้าหมายหรือรางวัล ระบบจะส่งกลับให้พนักงานกดยอมรับก่อนเริ่ม</p>
            <div className="flex gap-2">
              <button onClick={approve} disabled={busy} className="btn-brand flex-1">อนุมัติ</button>
              <button onClick={() => setMode(null)} className="btn-ghost">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE modal */}
      {mode === "complete" && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMode(null)} />
          <div className="relative card p-6 w-full max-w-md my-8 space-y-4">
            <h3 className="font-bold text-lg">ปิดภารกิจ & ให้รางวัล 🏆</h3>
            <div>
              <div className="label">ระดับความสำเร็จ</div>
              <div className="space-y-1.5">
                {COMPLETION.map((c) => (
                  <button key={c.key} type="button" onClick={() => { setCompletion(c.key); setTier(suggestTier(c.key, impact)); }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm ${completion === c.key ? "bg-brand-soft text-gold font-semibold" : "bg-sand/50"}`}>
                    {c.th} <span className="text-xs text-muted">×{c.mult}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-mint-soft/60 p-3 text-sm">ได้คะแนน <b className="text-lg">{points}</b> แต้ม</div>
            <div>
              <div className="label">Badge ที่จะมอบ (เลือกหรือพิมพ์ใหม่)</div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" list="approve-badges" placeholder="ชื่อ Badge" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} />
                <datalist id="approve-badges">
                  {badges.map((b, i) => <option key={i} value={b.name} />)}
                </datalist>
                <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
                  {Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.th}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={complete} disabled={busy} className="btn-brand flex-1">ยืนยันสำเร็จ & มอบรางวัล</button>
              <button onClick={() => setMode(null)} className="btn-ghost">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
