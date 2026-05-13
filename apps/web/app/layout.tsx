import "../styles/globals.css";
import Link from "next/link";

export const metadata = { title: "Crucible — Public Leaderboard", description: "Verifiable AI trading agent benchmarks on 0G" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold flex items-center gap-2">
              🔥 <span>Crucible</span>
              <span className="text-xs text-slate-500 font-normal">Public Leaderboard</span>
            </Link>
            <nav className="space-x-4 text-sm">
              <Link href="/" className="text-slate-300 hover:text-white">Leaderboard</Link>
              <a href="https://docs.0g.ai" target="_blank" rel="noopener" className="text-slate-300 hover:text-white">Built on 0G</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
