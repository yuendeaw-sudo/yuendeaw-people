"use client";

import { useState } from "react";

/**
 * YuenDeaw logo mark. Loads /brand/logo.png (drop the official logo there).
 * Shows a golden "ยด" tile until the real image successfully loads — no
 * broken-image flash if the file is missing.
 */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  const [ok, setOk] = useState(false);

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {!ok && (
        <span
          className="absolute inset-0 grid place-items-center rounded-xl bg-brand text-ink font-extrabold"
          style={{ fontSize: size * 0.42 }}
        >
          ยด
        </span>
      )}
      <img
        src="/brand/logo.png"
        alt="ยืนเดี่ยว The Comedy Hub"
        onLoad={() => setOk(true)}
        className="absolute inset-0 h-full w-full object-contain transition-opacity"
        style={{ opacity: ok ? 1 : 0 }}
      />
    </span>
  );
}
