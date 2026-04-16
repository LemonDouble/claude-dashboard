import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

// mono는 숫자 정렬·단위 토글에 사용 (Pretendard는 globals.css에서 CDN import)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claude Dashboard",
  description: "Claude Code usage analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
