import type { Config } from "tailwindcss";

/**
 * YuenDeaw People OS — design tokens
 * Warm, creative, Gen-Z friendly. Not corporate-boring.
 * Cream surfaces, coral brand, soft ink, friendly accents.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // surfaces
        paper: "#FAF7F2", // app background (warm off-white)
        surface: "#FFFFFF", // cards
        sand: "#F1ECE2", // subtle fills / borders
        // text
        ink: "#1C1A17", // primary text
        muted: "#7A736A", // secondary text
        // brand + accents — YuenDeaw golden yellow (logo)
        brand: "#F7BE00", // golden yellow — use with INK text on fills
        "brand-soft": "#FFF1C2",
        gold: "#8A6800", // dark gold — for brand-colored TEXT/icons on light bg
        grape: "#6C5CE7", // creative accent
        "grape-soft": "#ECEAFE",
        mint: "#1FA672", // positive / success
        "mint-soft": "#DDF3EA",
        amber: "#E8A317", // warning / pending
        "amber-soft": "#FBF0D6",
        rose: "#E5484D", // danger / incident
        "rose-soft": "#FBE3E4",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,26,23,0.04), 0 8px 24px rgba(28,26,23,0.06)",
        pop: "0 12px 32px rgba(28,26,23,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-thai)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
