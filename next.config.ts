import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return { beforeFiles: [
      ...["/", "/ops", "/pilot", "/brief.css", "/brief-ui.js", "/brief-model.js", "/ops.js", "/office-handoffs.js", "/growth-ui.js", "/growth.css", "/md-visual.js", "/pixel.js", "/styles.css", "/app.js"].map(source => ({ source, has: [{ type: "host" as const, value: "aioffice\\.yuendeaw\\.com" }], destination: "/office-ai" + (source === "/" ? "" : source) })),
      ...["ops", "brief", "growth", "md-pilot", "scheduler", "direct"].map(namespace => ({ source: `/api/${namespace}/:path*`, has: [{ type: "host" as const, value: "aioffice\\.yuendeaw\\.com" }], destination: `/office-ai/api/${namespace}/:path*` })),
      { source: "/", has: [{ type: "host", value: "(?:www\\.)?yuendeaw\\.com" }], destination: "/office" },
      { source: "/apply/team", destination: "/join-crew/index.html" },
    ], afterFiles: [
      { source: "/internship", destination: "/internship/index.html" },
      { source: "/internship/apply", destination: "/internship/apply/index.html" },
      { source: "/internship/apply/", destination: "/internship/apply/index.html" },
    ], fallback: [] };
  },
  images: {
    remotePatterns: [
      // Google Workspace avatars (future SSO)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // Supabase Storage (documents, avatars, evidence)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
