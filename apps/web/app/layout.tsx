import "../styles/globals.css";
import { TerminalHeader } from "@crucible/ui-kit";
import { Providers } from "@/components/Providers";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export const metadata = {
  title: "Crucible — Proving Ground",
  description: "Verifiable AI trading agent benchmarks on 0G",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <TerminalHeader
            tagline="Proving Ground"
            network="GALILEO  chain 16602"
            nav={[
              { label: "Scenarios", href: "/scenarios" },
              { label: "My Agents", href: "/my-agents" },
              { label: "Leaderboard", href: "/leaderboard" },
              { label: "Community", href: "/community" },
              { label: "GitHub", href: "https://github.com/" },
            ]}
            rightSlot={<WalletConnectButton />}
          />
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
