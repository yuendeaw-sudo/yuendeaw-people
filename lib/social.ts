export type Platform = { key: string; label: string; emoji: string };

export const PLATFORMS: Platform[] = [
  { key: "facebook", label: "Facebook", emoji: "📘" },
  { key: "instagram", label: "Instagram", emoji: "📸" },
  { key: "tiktok", label: "TikTok", emoji: "🎵" },
  { key: "youtube", label: "YouTube", emoji: "▶️" },
  { key: "line_oa", label: "LINE OA", emoji: "💚" },
  { key: "x", label: "X (Twitter)", emoji: "✖️" },
  { key: "threads", label: "Threads", emoji: "🧵" },
  { key: "other", label: "อื่น ๆ", emoji: "🔗" },
];

export const PLATFORM_MAP: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p])
);

export function platformOf(key: string): Platform {
  return PLATFORM_MAP[key] ?? { key, label: key, emoji: "🔗" };
}
