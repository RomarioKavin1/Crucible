import "../styles/globals.css";
import { TerminalHeader } from "@crucible/ui-kit";

export const metadata = {
  title: "Crucible — Proving Ground",
  description: "Verifiable AI trading agent benchmarks on 0G",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TerminalHeader
          tagline="Proving Ground"
          network="GALILEO  chain 16602"
          nav={[
            { label: "Leaderboard", href: "/" },
            { label: "Built on 0G", href: "https://docs.0g.ai" },
          ]}
        />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
