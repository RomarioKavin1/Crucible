import "../styles/globals.css";
import { TerminalHeader } from "@crucible/ui-kit";

export const metadata = {
  title: "Crucible — Lab",
  description: "Run, watch, and publish AI trading agent benchmarks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TerminalHeader
          tagline="Lab"
          network="localhost / GALILEO"
          nav={[
            { label: "Runs", href: "/" },
            { label: "New Run", href: "/new" },
          ]}
        />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
