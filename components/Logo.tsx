"use client";

import { useState } from "react";

/**
 * YuenDeaw logo mark — shows /brand/logo.png and only falls back to a golden
 * "ยด" tile if the image actually fails to load. (Showing the image by default
 * avoids the cached-image bug where onLoad never fires and the fallback sticks.)
 */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`grid place-items-center rounded-xl bg-brand text-ink font-extrabold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        ยด
      </span>
    );
  }

  return (
    <img
      src="/brand/logo.png"
      alt="ยืนเดี่ยว The Comedy Hub"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
