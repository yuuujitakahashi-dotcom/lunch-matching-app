import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lunch Matching",
  description: "社内ランチマッチングアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={geist.variable}>
      <body className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-background">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="text-sm font-semibold tracking-tight">
              Lunch Matching
            </a>
            <a href="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              今週の状況
            </a>
          </div>
        </header>
        <main className="max-w-xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
