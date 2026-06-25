"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function AvatarUpload({
  name,
  src,
  size = 72,
}: {
  name: string;
  src: string | null;
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(src);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      if (!r.ok) {
        setErr((await r.text()) || "อัปโหลดไม่สำเร็จ");
      } else {
        const { avatarUrl } = await r.json();
        setPreview(avatarUrl);
        router.refresh();
      }
    } catch {
      setErr("อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar name={name} src={preview} size={size} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 grid place-items-center size-7 rounded-full bg-brand text-ink shadow ring-2 ring-paper hover:brightness-95 transition disabled:opacity-60"
        title="เปลี่ยนรูปโปรไฟล์"
        aria-label="เปลี่ยนรูปโปรไฟล์"
      >
        <Icon name={busy ? "Loader" : "Camera"} className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {err && (
        <p className="absolute top-full mt-1 left-0 whitespace-nowrap text-[11px] text-rose">{err}</p>
      )}
    </div>
  );
}
