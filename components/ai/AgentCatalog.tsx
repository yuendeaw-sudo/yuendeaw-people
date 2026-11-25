"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

export type WorkplaceAgent = {
  key: string;
  name: string;
  description: string | null;
  ownerOnly: boolean;
};

const ICON_BY_KEY: Record<string, string> = {
  hr_assistant: "Users",
  handbook_assistant: "BookOpen",
  production_assistant: "Clapperboard",
  script_comment: "FilePenLine",
  proposal_assistant: "Presentation",
  social_caption: "PenLine",
  sales_proposal: "BriefcaseBusiness",
  studio_booking: "CalendarClock",
  finance_reminder: "Wallet",
  intern_mentor: "GraduationCap",
  meeting_summary: "NotebookPen",
  project_checklist: "ListChecks",
};

export function AgentCatalog({ agents }: { agents: WorkplaceAgent[] }) {
  const [search, setSearch] = useState("");
  const visibleAgents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? agents.filter((agent) =>
          [agent.name, agent.description ?? "", agent.key].some((part) =>
            part.toLocaleLowerCase().includes(query),
          ),
        )
      : agents;
  }, [agents, search]);

  return (
    <section aria-label="AI Assistants ของทีม" className="space-y-4">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="agent-search" className="relative block min-w-0 flex-1">
          <Icon name="Search" aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <input
            id="agent-search"
            className="input w-full pl-10"
            type="search"
            autoComplete="off"
            placeholder="ค้นหา AI ผู้ช่วยที่เหมาะกับงาน..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span className="shrink-0 text-xs text-muted">
          {visibleAgents.length} / {agents.length} ผู้ช่วย
        </span>
      </div>

      {visibleAgents.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">ไม่พบ AI Assistant ที่ค้นหา</p>
          <p className="mt-1 text-sm text-muted">ลองค้นหาด้วยชื่อหรือประเภทงานอื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAgents.map((agent, index) => (
            <Link
              key={agent.key}
              href={`/ai-workplace/${encodeURIComponent(agent.key)}`}
              className="card group flex min-h-36 flex-col p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={
                    "grid size-11 shrink-0 place-items-center rounded-xl " +
                    (index % 3 === 0
                      ? "bg-brand-soft text-gold"
                      : index % 3 === 1
                        ? "bg-grape-soft text-grape"
                        : "bg-mint-soft text-mint")
                  }
                >
                  <Icon name={ICON_BY_KEY[agent.key] ?? "Sparkles"} aria-hidden="true" className="size-5" />
                </div>
                {agent.ownerOnly ? (
                  <span className="chip bg-amber-soft text-[#9a6b06]">เฉพาะเจ้าของ</span>
                ) : null}
              </div>
              <div className="mt-3 min-w-0 flex-1">
                <h2 className="break-words font-bold text-ink">{agent.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {agent.description || "ผู้ช่วย AI สำหรับงานของทีม"}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gold">
                เริ่มคุย <Icon name="ArrowUpRight" aria-hidden="true" className="size-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
