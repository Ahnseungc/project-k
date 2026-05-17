import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gold Meter — Sparse Ellipsometry",
  description: "스마트폰 편광 촬영으로 금 함량(K)을 추정합니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans text-ink antialiased`}>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
