"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatThaiDate } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  doc_type: string | null;
  storage_path: string | null;
  external_url?: string | null;
  created_at?: string;
};

const ALL_ZONES: { type: string; label: string; icon: string }[] = [
  { type: "id", label: "สำเนาบัตรประชาชน", icon: "IdCard" },
  { type: "house_reg", label: "สำเนาทะเบียนบ้าน", icon: "House" },
  { type: "bank_book", label: "สำเนา Book Bank", icon: "Landmark" },
  { type: "contract", label: "สัญญาจ้าง", icon: "FileSignature" },
  { type: "other", label: "เอกสารอื่น ๆ", icon: "Files" },
];

const KNOWN_TYPES = ["id", "house_reg", "bank_book", "contract"];

export function EmployeeDocuments({
  employeeId,
  initialDocs,
  canEdit,
  canView,
  zones,
}: {
  employeeId: string;
  initialDocs: Doc[];
  canEdit: boolean;
  canView: boolean;
  /** which zones to show; defaults to all. e.g. ["id","house_reg","bank_book","other"] */
  zones?: string[];
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs || []);
  const ZONES = zones ? ALL_ZONES.filter((z) => zones.includes(z.type)) : ALL_ZONES;

  if (!canView && !canEdit) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-sand text-muted mb-3">
          <Icon name="Lock" className="size-6" />
        </div>
        <p className="font-semibold">เอกสารถูกจำกัดสิทธิ์</p>
        <p className="text-sm text-muted mt-1">เห็นได้เฉพาะ Owner / HR</p>
      </div>
    );
  }

  // group known types; everything else falls under "other"
  const byType = (t: string) =>
    docs.filter((d) =>
      t === "other" ? !KNOWN_TYPES.includes(d.doc_type || "") : d.doc_type === t
    );

  return (
    <div className="space-y-5">
      {ZONES.map((z) => (
        <DocZone
          key={z.type}
          zone={z}
          employeeId={employeeId}
          docs={byType(z.type)}
          canEdit={canEdit}
          canView={canView}
          onAdd={(d) => setDocs((prev) => [d, ...prev])}
          onRemove={(id) => setDocs((prev) => prev.filter((x) => x.id !== id))}
        />
      ))}
    </div>
  );
}

function DocZone({
  zone,
  employeeId,
  docs,
  canEdit,
  canView,
  onAdd,
  onRemove,
}: {
  zone: { type: string; label: string; icon: string };
  employeeId: string;
  docs: Doc[];
  canEdit: boolean;
  canView: boolean;
  onAdd: (d: Doc) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("employeeId", employeeId);
    fd.append("docType", zone.type);
    try {
      const r = await fetch("/api/people/document", { method: "POST", body: fd });
      if (!r.ok) {
        setErr((await r.text()) || "อัปโหลดไม่สำเร็จ");
      } else {
        const { doc } = await r.json();
        onAdd(doc);
      }
    } catch {
      setErr("อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบเอกสารนี้?")) return;
    const r = await fetch("/api/people/document", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    if (r.ok) onRemove(id);
  }

  const viewHref = (d: Doc, download = false) =>
    d.storage_path
      ? `/api/people/document/view?path=${encodeURIComponent(d.storage_path)}${download ? "&download=1" : ""}`
      : d.external_url || "#";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={zone.icon} className="size-4 text-gold" />
        <h4 className="font-semibold text-sm">{zone.label}</h4>
        {docs.length > 0 && <span className="text-xs text-muted">({docs.length})</span>}
      </div>

      {/* existing files */}
      {canView && docs.length > 0 && (
        <div className="space-y-2 mb-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl bg-sand/40 px-3 py-2.5">
              <Icon name="FileText" className="size-5 text-grape shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{d.title}</div>
                {d.created_at && <div className="text-[11px] text-muted">{formatThaiDate(d.created_at)}</div>}
              </div>
              <a href={viewHref(d, true)} className="btn-outline !px-2.5 !py-1.5 text-xs" title="ดาวน์โหลด">
                <Icon name="Download" className="size-3.5" />
              </a>
              <a
                href={viewHref(d)}
                target="_blank"
                rel="noreferrer"
                className="btn-outline !px-2.5 !py-1.5 text-xs"
                title="เปิด / พิมพ์"
              >
                <Icon name="Printer" className="size-3.5" />
              </a>
              {canEdit && (
                <button
                  onClick={() => remove(d.id)}
                  className="text-muted hover:text-rose p-1.5"
                  title="ลบ"
                >
                  <Icon name="X" className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* upload zone */}
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
            drag ? "border-brand bg-brand-soft" : "border-sand"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          {busy ? (
            <p className="text-sm text-muted">กำลังอัปโหลด…</p>
          ) : (
            <>
              <p className="text-sm text-muted">ลากและวางไฟล์ที่นี่ หรือ</p>
              <button onClick={() => inputRef.current?.click()} className="btn-outline mt-2 text-sm">
                <Icon name="Paperclip" className="size-3.5" /> แนบไฟล์ภาพ/เอกสาร
              </button>
              <p className="text-[11px] text-muted mt-2">รองรับรูปภาพ หรือ PDF · ไม่เกิน 20MB</p>
            </>
          )}
          {err && <p className="text-xs text-rose mt-2">{err}</p>}
        </div>
      )}
    </div>
  );
}
