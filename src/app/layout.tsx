import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
