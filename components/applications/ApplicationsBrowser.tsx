"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";
import { APP_STATUS, statusOf, ROLE_LABEL, INTERESTED_ROLES, HR_RECOMMENDATION, DEFAULT_TAGS } from "@/lib/applications";

export function ApplicationsBrowser({ apps }: { apps: any[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [rec, setRec] = useState("");
  const [tag, setTag] = useState("");
  const [minScore, setMinScore] = useState(0);

  const stats = useMemo(() => {
    const c = (pred: (a: any) => boolean) => apps.filter(pred).length;
    return {
      all: apps.length,
      new: c((a) => a.stage === "new"),
      hr: c((a) => a.stage === "hr_screening"),
      owner: c((a) => a.stage === "owner_review"),
      interview: c((a) => ["interview_shortlist", "interview_scheduled", "interview_done"].includes(a.stage)),
      pool: c((a) => a.stage === "talent_pool"),
      rejected: c((a) => a.stage === "rejected"),
    };
  }, [apps]);

  const allTags = useMemo(() => {
    const s = new Set<string>(DEFAULT_TAGS);
    apps.forEach((a) => (a.tags ?? []).forEach((t: string) => s.add(t)));
    return [...s];
  }, [apps]);

  const filtered = apps.filter((a) => {
    if (type && a.applicant_type !== type) return false;
    if (role && !(a.interested_roles ?? []).includes(role)) return false;
    if (status && a.stage !== status) return false;
    if (rec && a.hr_recommendation !== rec) return false;
    if (tag && !(a.tags ?? []).includes(tag)) return false;
    if (minScore && Number(a.score || 0) < minScore) return false;
    if (q) {
      const hay = `${a.full_name} ${a.nickname || ""} ${a.email} ${a.location || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const STAT_CARDS = [
    { label: "ทั้งหมด", v: stats.all, tone: "brand" },
    { label: "ใหม่", v: stats.new, tone: "grape" },
    { label: "รอ HR คัดกรอง", v: stats.hr, tone: "amber" },
    { label: "รอ Owner", v: stats.owner, tone: "brand" },
    { label: "รอสัมภาษณ์", v: stats.interview, tone: "mint" },
    { label: "Talent Pool", v: stats.pool, tone: "sand" },
    { label: "ไม่ผ่าน", v: stats.rejected, tone: "rose" },
  ];

  return (
    <div className="space-y-5">
      {/* pipeline counts */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-2xl font-extrabold">{s.v}</div>
            <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="card p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input className="input" placeholder="ค้นหาชื่อ/อีเมล/จังหวัด…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">ทุกประเภท</option>
          <option value="full_time">พนักงานประจำ</option>
          <option value="internship">เด็กฝึกงาน</option>
        </select>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ทุกสายงาน</option>
          {INTERESTED_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input" value={rec} onChange={(e) => setRec(e.target.value)}>
          <option value="">HR แนะนำ: ทั้งหมด</option>
          {HR_RECOMMENDATION.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">ทุก tag</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
          <option value={0}>คะแนนขั้นต่ำ: ใดก็ได้</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>≥ {n}</option>)}
        </select>
      </div>

      {/* cards */}
      {filtered.length ? (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((a) => {
            const st = statusOf(a.stage);
            const rc = HR_RECOMMENDATION.find((r) => r.key === a.hr_recommendation);
            return (
              <Link key={a.id} href={`/applications/${a.id}`} className="card p-4 hover:shadow-pop transition">
                <div className="flex items-start gap-3">
                  <Avatar name={a.nickname || a.full_name} src={a.photo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{a.full_name}{a.nickname && <span className="text-muted"> ({a.nickname})</span>}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {rc && <Badge tone={rc.tone}>{rc.label}</Badge>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {a.applicant_type === "internship" ? "เด็กฝึกงาน" : "พนักงานประจำ"}
                      {a.age ? ` · ${a.age} ปี` : ""}{a.location ? ` · ${a.location}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(a.interested_roles ?? []).map((r: string) => (
                        <span key={r} className="chip bg-sand text-muted text-[11px]">{ROLE_LABEL[r] ?? r}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
                      {a.intro_video_url && <span className="inline-flex items-center gap-1 text-gold"><Icon name="Video" className="size-3" /> มีคลิป</span>}
                      {(a.portfolio_url || (a.portfolio_links ?? []).length) && <span className="inline-flex items-center gap-1"><Icon name="Link" className="size-3" /> ผลงาน</span>}
                      {a.available_date && <span>เริ่ม {formatThaiDate(a.available_date)}</span>}
                      {a.expected_salary && <span>💰 {a.expected_salary}</span>}
                    </div>
                    {(a.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(a.tags ?? []).slice(0, 4).map((t: string) => <span key={t} className="chip bg-brand-soft text-gold text-[10px]">{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center text-muted">ไม่พบใบสมัครตามเงื่อนไข</div>
      )}
    </div>
  );
}
