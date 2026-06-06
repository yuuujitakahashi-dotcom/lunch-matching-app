import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ランチマッチング",
  description: "社内ランチマッチングアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-orange-50 text-gray-800" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
        <header className="bg-white border-b border-orange-100 px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-orange-500">🍱 ランチマッチング</a>
          <a href="/status" className="text-sm text-orange-400 hover:text-orange-600">今週の状況</a>
        </header>
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
