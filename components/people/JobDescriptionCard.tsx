"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

type Emp = { id: string; name: string };

export function JobDescriptionCard({
  employeeId,
  initialContent,
  canEdit,
  canTransfer = false,
  transferTargets = [],
  defaultOpen = false,
}: {
  employeeId: string;
  initialContent: string | null;
  canEdit: boolean;
  canTransfer?: boolean;
  transferTargets?: Emp[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const [busy, setBusy] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/job-description", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, content }),
      });
      if (r.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function transfer() {
    if (!target) return;
    setBusy(true);
    try {
      const r = await fetch("/api/job-description/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEmployeeId: employeeId, toEmployeeId: target }),
      });
      if (r.ok) {
        setTransferOpen(false);
        setTarget("");
        setMsg("ส่ง Job Description ให้พนักงานแล้ว ✓");
        setTimeout(() => setMsg(null), 2500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="grid place-items-center size-9 rounded-xl bg-brand-soft text-gold shrink-0">
          <Icon name="ClipboardList" className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Job Description</div>
          <div className="text-xs text-muted truncate">
            {content ? "หน้าที่ความรับผิดชอบในการทำงาน" : "ยังไม่ได้กรอก"}
          </div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} className="size-5 text-muted shrink-0" />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-sand/60 pt-4">
          {editing ? (
            <>
              <textarea
                className="input min-h-48 leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"เช่น\n- ดูแลคิวงานถ่ายทำและประสานทีม\n- จัดการอุปกรณ์และสถานที่\n- สรุปงานส่งหัวหน้าทุกสัปดาห์"}
              />
              <div className="flex gap-2 mt-3">
                <button onClick={save} disabled={busy} className="btn-brand">
                  <Icon name="Check" className="size-4" /> {busy ? "กำลังบันทึก…" : "บันทึก"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setContent(initialContent ?? "");
                  }}
                  className="btn-outline"
                >
                  ยกเลิก
                </button>
              </div>
            </>
          ) : (
            <>
              {content ? (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{content}</div>
              ) : (
                <p className="text-sm text-muted">
                  ยังไม่มี Job Description{canEdit ? " — กด “แก้ไข” เพื่อเพิ่ม" : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {canEdit && (
                  <button onClick={() => setEditing(true)} className="btn-outline">
                    <Icon name="Pencil" className="size-4" /> แก้ไข
                  </button>
                )}
                {canTransfer && content && (
                  <button onClick={() => setTransferOpen((t) => !t)} className="btn-outline">
                    <Icon name="Send" className="size-4" /> ส่งต่อให้พนักงานคนถัดไป
                  </button>
                )}
              </div>

              {transferOpen && (
                <div className="mt-3 rounded-xl bg-sand/40 p-3">
                  <label className="label">เลือกพนักงานที่จะรับช่วงงานนี้</label>
                  <div className="flex gap-2">
                    <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="">— เลือกพนักงาน —</option>
                      {transferTargets.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={transfer} disabled={busy || !target} className="btn-brand shrink-0">
                      ส่ง
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2">
                    Job Description นี้จะถูกคัดลอกไปให้พนักงานที่เลือก พร้อมแจ้งเตือนเขา
                  </p>
                </div>
              )}
              {msg && <p className="text-sm text-mint mt-2">{msg}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
