import type { Metadata } from "next";

const TITLE = "สมัครร่วมทีม YuenDeaw · Join the Team";
const DESC =
  "มาสร้างความบันเทิงที่คนอยากดูไปด้วยกัน! เปิดรับ Stand-up Comedy · Content Production · Creative — ฝากโปรไฟล์ ผลงาน และคลิปแนะนำตัวไว้กับเราได้เลย";
const OG_IMAGE = "/brand/apply-team-og.jpg";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: {
    type: "website",
    siteName: "YuenDeaw",
    title: TITLE,
    description: DESC,
    url: "/apply/team",
    locale: "th_TH",
    images: [{ url: OG_IMAGE, width: 1254, height: 1254, alt: "สมัครร่วมทีม YuenDeaw" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: [OG_IMAGE],
  },
};

export default function TeamApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
