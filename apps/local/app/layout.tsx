import "../styles/globals.css";

export const metadata = { title: "Crucible — Local", description: "AI trading agent benchmark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">🔥 Crucible</h1>
            <nav className="space-x-4 text-sm">
              <a href="/" className="text-slate-300 hover:text-white">Runs</a>
              <a href="/new" className="text-slate-300 hover:text-white">New Run</a>
            </nav>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
