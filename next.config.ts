import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
