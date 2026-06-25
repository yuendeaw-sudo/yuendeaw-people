"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Badge, statusBadge } from "@/components/ui";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { EmployeeDocuments } from "@/components/people/EmployeeDocuments";

type Tab = { key: string; label: string; icon: string };

const MASK = "••••••";

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 py-2 border-b border-sand/50 last:border-0">
      <span className="text-sm text-muted w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || <span className="text-muted/60">—</span>}</span>
    </div>
  );
}

function Block({
  title,
  icon,
  editHref,
  children,
  right,
}: {
  title: string;
  icon: string;
  editHref?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} className="size-4 text-gold" />
        <h3 className="font-semibold">{title}</h3>
        {editHref && (
          <Link href={editHref} className="text-xs font-semibold text-gold hover:underline flex items-center gap-1">
            <Icon name="Pencil" className="size-3" /> แก้ไข
          </Link>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const AUDIT_LABEL: Record<string, { label: string; icon: string; tone: string }> = {
  self_update_profile: { label: "พนักงานแก้ข้อมูลติดต่อ", icon: "Pencil", tone: "grape" },
  self_update_avatar: { label: "พนักงานเปลี่ยนรูปโปรไฟล์", icon: "Camera", tone: "grape" },
  view_salary: { label: "เปิดดูค่าตอบแทน", icon: "Eye", tone: "sand" },
};

export function EmployeeTabs({
  e,
  comp,
  documents,
  canSensitive,
  editHref,
  auditLogs = [],
}: {
  e: any;
  comp: any[] | null;
  documents: any[];
  canSensitive: boolean;
  editHref: string | null;
  auditLogs?: any[];
}) {
  const [tab, setTab] = useState("personal");
  const [reveal, setReveal] = useState(false);

  const ec = e.emergency_contact ?? {};
  const latestComp = comp?.[0];

  const TABS: Tab[] = [
    { key: "personal", label: "ข้อมูลพนักงาน", icon: "IdCard" },
    { key: "employment", label: "การจ้างงาน", icon: "BriefcaseBusiness" },
    { key: "comp", label: "เงินเดือน/ค่าจ้าง", icon: "Wallet" },
    { key: "documents", label: "เอกสารสำคัญ", icon: "FileText" },
    { key: "history", label: "ประวัติ", icon: "History" },
  ];

  const sens = (v: any) => (canSensitive ? v : <span className="text-muted/60 italic text-xs">เฉพาะผู้มีสิทธิ์</span>);

  return (
    <div className="card overflow-hidden">
      {/* tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-sand/70 px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition ${
              tab === t.key ? "bg-brand-soft text-gold" : "text-muted hover:text-ink hover:bg-sand/40"
            }`}
          >
            <Icon name={t.icon} className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* PERSONAL */}
        {tab === "personal" && (
          <>
            <Block title="ข้อมูลพื้นฐาน" icon="IdCard" editHref={editHref ?? undefined}>
              <Row label="รหัสพนักงาน" value={e.employee_code} />
              <Row label="ชื่อ-นามสกุล" value={`${e.first_name} ${e.last_name ?? ""}`} />
              <Row label="ชื่อเล่น" value={e.nickname} />
              <Row label="ชื่อ-นามสกุล (EN)" value={[e.first_name_en, e.last_name_en].filter(Boolean).join(" ") || null} />
              <Row label="ชื่อเล่น (EN)" value={e.nickname_en} />
              <Row label="เลขบัตรประชาชน" value={sens(e.national_id)} />
              <Row label="เลขหนังสือเดินทาง" value={sens(e.passport_no)} />
              <Row label="วันเกิด" value={canSensitive ? (e.birth_date ? formatThaiDate(e.birth_date) : null) : sens(null)} />
            </Block>
            <Block title="ข้อมูลการติดต่อ" icon="Phone" editHref={editHref ?? undefined}>
              <Row label="เบอร์มือถือ" value={e.phone} />
              <Row label="อีเมล" value={e.email} />
              <Row label="Line ID" value={e.line_id} />
              <Row label="ที่อยู่" value={e.address} />
              <Row label="ผู้ติดต่อฉุกเฉิน" value={ec.name} />
              <Row label="เบอร์ติดต่อฉุกเฉิน" value={ec.phone} />
              <Row label="ความสัมพันธ์" value={ec.relation} />
            </Block>
          </>
        )}

        {/* EMPLOYMENT */}
        {tab === "employment" && (
          <Block title="ข้อมูลการจ้างงาน" icon="BriefcaseBusiness" editHref={editHref ?? undefined}>
            <Row label="วันที่เริ่มงาน" value={formatThaiDate(e.start_date)} />
            <Row label="รูปแบบการจ้างงาน" value={e.employment_types?.name} />
            <Row
              label="สถานะ"
              value={(() => {
                const sb = statusBadge(e.status);
                return <Badge tone={sb.tone}>{sb.label}</Badge>;
              })()}
            />
            <Row label="แผนก" value={e.departments?.name} />
            <Row label="ทีม" value={e.teams?.name} />
            <Row label="ตำแหน่ง" value={e.position_title} />
            <Row label="หัวหน้างาน" value={e.manager?.nickname || e.manager?.first_name} />
            <Row label="รูปแบบการทำงาน" value={e.work_mode} />
            <Row label="สิ้นสุดทดลองงาน" value={e.probation_end_date ? formatThaiDate(e.probation_end_date) : null} />
          </Block>
        )}

        {/* COMP */}
        {tab === "comp" &&
          (canSensitive ? (
            <>
              <Block
                title="เงินเดือน / ค่าตอบแทน"
                icon="Wallet"
                editHref={editHref ?? undefined}
                right={
                  <button onClick={() => setReveal((r) => !r)} className="text-muted hover:text-ink" title={reveal ? "ซ่อน" : "เปิดดู"}>
                    <Icon name={reveal ? "EyeOff" : "Eye"} className="size-4" />
                  </button>
                }
              >
                <div className="rounded-xl2 bg-sand/40 p-4 mb-3">
                  <div className="text-xs text-muted">ค่าตอบแทนปัจจุบัน</div>
                  <div className="text-3xl font-extrabold mt-1">
                    {reveal ? formatTHB(latestComp ? Number(latestComp.amount) : null) : MASK}
                    {latestComp && <span className="text-sm font-normal text-muted"> / {latestComp.comp_type}</span>}
                  </div>
                </div>
                <Row label="ธนาคาร" value={e.bank_name} />
                <Row label="เลขที่บัญชี" value={e.bank_account ? (reveal ? e.bank_account : MASK) : null} />
                <Row label="ประเภทบัญชี" value={e.bank_account_type} />
                <Row label="สาขา" value={e.bank_branch} />
              </Block>
              {comp && comp.length > 1 && (
                <Block title="ประวัติค่าตอบแทน" icon="History">
                  <div className="space-y-2">
                    {comp.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-sand/40 px-3 py-2 text-sm">
                        <span className="font-semibold">{reveal ? formatTHB(Number(c.amount)) : MASK}</span>
                        <span className="text-xs text-muted">{c.comp_type} · ตั้งแต่ {formatThaiDate(c.effective_date)}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-sand text-muted mb-3">
                <Icon name="Lock" className="size-6" />
              </div>
              <p className="font-semibold">ข้อมูลค่าตอบแทนถูกจำกัดสิทธิ์</p>
              <p className="text-sm text-muted mt-1">เห็นได้เฉพาะ Owner / HR / Finance</p>
            </div>
          ))}

        {/* DOCUMENTS */}
        {tab === "documents" && (
          <Block title="เอกสารสำคัญพนักงาน" icon="FileText">
            <EmployeeDocuments
              employeeId={e.id}
              initialDocs={documents}
              canEdit={!!editHref}
              canView={canSensitive}
            />
          </Block>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <Block title="ประวัติการเปลี่ยนแปลง" icon="History">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="grid place-items-center size-7 rounded-full bg-mint-soft text-mint shrink-0">
                  <Icon name="UserPlus" className="size-3.5" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">เพิ่มเข้าระบบ</div>
                  <div className="text-xs text-muted">{formatThaiDate(e.created_at)}</div>
                </div>
              </div>
              {canSensitive &&
                comp?.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="grid place-items-center size-7 rounded-full bg-brand-soft text-gold shrink-0">
                      <Icon name="Wallet" className="size-3.5" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">ปรับค่าตอบแทน → {reveal ? formatTHB(Number(c.amount)) : MASK}</div>
                      <div className="text-xs text-muted">มีผล {formatThaiDate(c.effective_date)}</div>
                    </div>
                  </div>
                ))}
              {/* Real audit trail — who changed what (HR/owner only) */}
              {auditLogs.map((a) => {
                const m = AUDIT_LABEL[a.action] ?? { label: a.action, icon: "Activity", tone: "sand" };
                const changed = a.meta?.changed as string[] | undefined;
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="grid place-items-center size-7 rounded-full bg-grape-soft text-grape shrink-0">
                      <Icon name={m.icon} className="size-3.5" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted">
                        {a.actor_email || "ระบบ"} · {formatThaiDate(a.created_at)}
                        {changed?.length ? ` · ${changed.join(", ")}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3">
                <div className="grid place-items-center size-7 rounded-full bg-sand text-muted shrink-0">
                  <Icon name="RefreshCw" className="size-3.5" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">อัปเดตล่าสุด</div>
                  <div className="text-xs text-muted">{formatThaiDate(e.updated_at)}</div>
                </div>
              </div>
            </div>
            {!auditLogs.length && (
              <p className="text-[11px] text-muted mt-4">ยังไม่มีบันทึกการแก้ไขจากระบบ</p>
            )}
          </Block>
        )}
      </div>
    </div>
  );
}
