import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"], // 300 (font-light) is unused — dropped to trim font payload
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://people.yuendeaw.com"),
  title: "YuenDeaw People OS",
  description: "People OS สำหรับทีม YuenDeaw — บริหารคน เติบโต และทำงานแบบคนรุ่นใหม่",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body>{children}</body>
    </html>
  );
}
