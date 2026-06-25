"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Tpl = { id: string; name: string; review_cycle: string; dimensions: { key: string; label: string }[] };

export function ReviewForm({
  employees,
  templates,
  reviewerId,
}: {
  employees: { id: string; name: string }[];
  templates: Tpl[];
  reviewerId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [tplId, setTplId] = useState("");
  const [scores, setScores] = useState<Record<string, { score: number; comment: string; evidence: string }>>({});
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tpl = templates.find((t) => t.id === tplId);
  const dims = tpl?.dimensions ?? [];

  function setScore(key: string, patch: Partial<{ score: number; comment: string; evidence: string }>) {
    setScores((s) => {
      const cur = s[key] ?? { score: 3, comment: "", evidence: "" };
      return { ...s, [key]: { ...cur, ...patch } };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !tplId) {
      setError("เลือกพนักงานและ template");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const vals = dims.map((d) => scores[d.key]?.score ?? 3);
    const overall = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;

    const { data: review, error: rErr } = await supabase
      .from("performance_reviews")
      .insert({
        employee_id: employeeId,
        template_id: tplId,
        reviewer_id: reviewerId,
        cycle: tpl?.review_cycle,
        status: "finalized",
        overall_score: overall,
        summary: summary || null,
      })
      .select("id")
      .single();
    if (rErr) {
      setError(rErr.message);
      setLoading(false);
      return;
    }

    const rows = dims.map((d) => ({
      review_id: review.id,
      dimension: d.label,
      score: scores[d.key]?.score ?? 3,
      comment: scores[d.key]?.comment || null,
      evidence: scores[d.key]?.evidence ? [{ link: scores[d.key]!.evidence }] : [],
    }));
    if (rows.length) await supabase.from("performance_scores").insert(rows);

    setLoading(false);
    setOpen(false);
    setEmployeeId("");
    setTplId("");
    setScores({});
    setSummary("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand">
        <Icon name="Plus" className="size-4" /> ประเมินผลงาน
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative card p-6 w-full max-w-xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">ประเมินผลงาน (Evidence-based)</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <Icon name="X" className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">พนักงาน</label>
              <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">— เลือก —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">KPI Template</label>
              <select className="input" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                <option value="">— เลือก —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {dims.length > 0 && (
            <div className="space-y-3">
              {dims.map((d) => {
                const cur = scores[d.key]?.score ?? 3;
                return (
                  <div key={d.key} className="rounded-xl bg-sand/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{d.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            onClick={() => setScore(d.key, { score: n })}
                            className={`size-7 rounded-lg text-xs font-bold ${
                              cur >= n ? "bg-brand text-ink" : "bg-surface text-muted border border-sand"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      className="input mb-1.5"
                      placeholder="ความเห็น"
                      value={scores[d.key]?.comment ?? ""}
                      onChange={(e) => setScore(d.key, { comment: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="ลิงก์หลักฐาน (งาน/feedback)"
                      value={scores[d.key]?.evidence ?? ""}
                      onChange={(e) => setScore(d.key, { evidence: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="label">สรุปภาพรวม</label>
            <textarea className="input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full">
            {loading ? "กำลังบันทึก…" : "บันทึกผลประเมิน"}
          </button>
        </div>
      </form>
    </div>
  );
}
