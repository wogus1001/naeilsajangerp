import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "프랜차이즈 본부 ERP",
  description: "창업 및 부동산 전문가를 위한 통합 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
