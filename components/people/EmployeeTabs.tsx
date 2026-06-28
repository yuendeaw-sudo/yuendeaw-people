"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Badge, statusBadge } from "@/components/ui";
import { formatThaiDate, formatTHB } from "@/lib/utils";
import { workModeLabel } from "@/lib/phase2-labels";
import { EmployeeDocuments } from "@/components/people/EmployeeDocuments";
import { InternEvaluation } from "@/components/intern/InternEvaluation";

type Tab = { key: string; label: string; icon: string };

const MASK = "••••••";

// Thai social security: 5% of wage, wage floored at 1,650 and capped at 15,000 → max 750/mo.
function computeSSO(salary?: number | null) {
  if (!salary || salary <= 0) return 0;
  const wage = Math.min(Math.max(salary, 1650), 15000);
  return Math.round(wage * 0.05);
}

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
  self_upload_document: { label: "พนักงานอัปโหลดเอกสาร", icon: "FileUp", tone: "grape" },
  self_delete_document: { label: "พนักงานลบเอกสาร", icon: "FileX", tone: "grape" },
  upload_document: { label: "เพิ่มเอกสาร (HR)", icon: "FileUp", tone: "sand" },
  delete_document: { label: "ลบเอกสาร (HR)", icon: "FileX", tone: "sand" },
  view_salary: { label: "เปิดดูค่าตอบแทน", icon: "Eye", tone: "sand" },
};

export function EmployeeTabs({
  e,
  comp,
  documents,
  canSensitive,
  editHref,
  auditLogs = [],
  intern = null,
}: {
  e: any;
  comp: any[] | null;
  documents: any[];
  canSensitive: boolean;
  editHref: string | null;
  auditLogs?: any[];
  intern?: any;
}) {
  const [tab, setTab] = useState("personal");
  const [reveal, setReveal] = useState(false);

  const ec = e.emergency_contact ?? {};
  const latestComp = comp?.[0];
  const salaryNum = latestComp ? Number(latestComp.amount) : null;
  const ssoEnrolled = (e.social_security ?? "enrolled") !== "not_enrolled";

  const TABS: Tab[] = [
    { key: "personal", label: "ข้อมูลพนักงาน", icon: "IdCard" },
    { key: "employment", label: "การจ้างงาน", icon: "BriefcaseBusiness" },
    { key: "comp", label: "เงินเดือน/ค่าจ้าง", icon: "Wallet" },
    { key: "documents", label: "เอกสารสำคัญ", icon: "FileText" },
    ...(intern ? [{ key: "intern", label: "ฝึกงาน", icon: "GraduationCap" }] : []),
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
            <Row label="รูปแบบการทำงาน" value={workModeLabel(e.work_mode)} />
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
                <Row label="ประเภทพนักงาน" value={(e as any).employment_types?.name} />
                <Row
                  label="สิทธิ์ประกันสังคม"
                  value={
                    ssoEnrolled ? (
                      <span className="text-mint">ขึ้นสิทธิ์ประกันสังคม</span>
                    ) : (
                      <span className="text-muted">ไม่ขึ้นประกันสังคม</span>
                    )
                  }
                />
                <div className="rounded-xl2 bg-sand/40 p-4 my-3">
                  <div className="text-xs text-muted">เงินเดือน / ค่าตอบแทนปัจจุบัน</div>
                  <div className="text-3xl font-extrabold mt-1">
                    {reveal ? formatTHB(salaryNum) : MASK}
                    {latestComp && <span className="text-sm font-normal text-muted"> / {latestComp.comp_type}</span>}
                  </div>
                </div>
                <Row
                  label="ประกันสังคม (ต่อเดือน)"
                  value={ssoEnrolled ? (reveal ? formatTHB(computeSSO(salaryNum)) : MASK) : "—"}
                />
                <Row
                  label="หัก ณ ที่จ่าย"
                  value={
                    Number(e.withholding_tax) > 0 ? (
                      <span className="text-gold">หัก ณ ที่จ่าย (3%)</span>
                    ) : (
                      <span className="text-muted">ไม่หัก</span>
                    )
                  }
                />
                <div className="h-px bg-sand/60 my-3" />
                <Row label="ธนาคาร" value={e.bank_name} />
                <Row label="เลขที่บัญชี" value={e.bank_account ? (reveal ? e.bank_account : MASK) : null} />
                <Row label="ประเภทบัญชี" value={e.bank_account_type} />
                <Row label="สาขา" value={e.bank_branch} />
              </Block>
              {comp && comp.length > 0 && (
                <Block title="ประวัติการปรับเพิ่ม / ลดเงินเดือน" icon="History">
                  <div className="space-y-2">
                    {comp.map((c, i) => {
                      const older = comp[i + 1]; // list is newest-first
                      const delta = older ? Number(c.amount) - Number(older.amount) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-sand/40 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{reveal ? formatTHB(Number(c.amount)) : MASK}</span>
                            {reveal && delta !== 0 && (
                              <span
                                className={`chip text-[11px] ${
                                  delta > 0 ? "bg-mint-soft text-mint" : "bg-rose-soft text-rose"
                                }`}
                              >
                                {delta > 0 ? "▲ ปรับเพิ่ม" : "▼ ปรับลด"} {formatTHB(Math.abs(delta))}
                              </span>
                            )}
                            {!older && <span className="chip text-[11px] bg-sand text-muted">เริ่มต้น</span>}
                          </div>
                          <span className="text-xs text-muted">
                            {c.comp_type} · ตั้งแต่ {formatThaiDate(c.effective_date)}
                          </span>
                        </div>
                      );
                    })}
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

        {/* INTERN */}
        {tab === "intern" && intern && (
          <Block title="ฝึกงาน — ความคืบหน้า & เบี้ยฝึก" icon="GraduationCap">
            <div className="rounded-xl2 bg-sand/40 p-4 mb-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted">สถานะประเมิน</div>
                <div className="font-semibold">
                  {intern.evalStatus === "passed" ? (
                    <span className="text-mint">ผ่านแล้ว</span>
                  ) : intern.evalStatus === "failed" ? (
                    <span className="text-rose">ไม่ผ่าน</span>
                  ) : (
                    <span className="text-gold">รอประเมิน</span>
                  )}
                </div>
                {intern.dueDate && !intern.stipend.stipendStart && (
                  <div className="text-xs text-muted">กำหนดประเมิน {formatThaiDate(intern.dueDate)}</div>
                )}
                {intern.mentorName && <div className="text-xs text-muted">พี่เลี้ยง: {intern.mentorName}</div>}
              </div>
              <div>
                <div className="text-xs text-muted">เบี้ยฝึก ({formatTHB(intern.stipend.rate)}/วัน)</div>
                <div className="font-semibold">
                  เดือนนี้ {intern.stipend.monthDays} วัน · {formatTHB(intern.stipend.monthEarned)}
                </div>
                <div className="text-xs text-muted">
                  รวม {intern.stipend.totalDays} วัน · {formatTHB(intern.stipend.totalEarned)}
                </div>
              </div>
            </div>

            {intern.canEvaluate && (
              <div className="mb-5">
                <InternEvaluation employeeId={intern.employeeId} defaultStipendStart={intern.dueDate} />
              </div>
            )}

            <h4 className="text-sm font-semibold text-muted mb-2">บันทึกประจำวัน ({intern.logs.length})</h4>
            {intern.logs.length ? (
              <div className="space-y-2">
                {intern.logs.map((l: any) => (
                  <div key={l.log_date} className="rounded-xl bg-sand/40 px-3 py-2">
                    <div className="text-xs font-medium text-gold">{formatThaiDate(l.log_date)}</div>
                    <div className="text-sm whitespace-pre-wrap">{l.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีบันทึกประจำวัน</p>
            )}
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
                const detail = a.meta?.title || changed?.join(", ") || "";
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="grid place-items-center size-7 rounded-full bg-grape-soft text-grape shrink-0">
                      <Icon name={m.icon} className="size-3.5" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted">
                        {a.actor_email || "ระบบ"} · {formatThaiDate(a.created_at)}
                        {detail ? ` · ${detail}` : ""}
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
