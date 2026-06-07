import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lunch Matching",
  description: "社内ランチマッチングアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-background">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="text-xl font-medium tracking-tight">
              Lunch Matching
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 pt-5 pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
