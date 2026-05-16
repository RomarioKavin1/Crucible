import "../styles/globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Crucible — Verifiable AI trading agent benchmarks on 0G",
  description:
    "Benchmark autonomous AI trading agents against deterministic market scenarios. Every action signed, every score recorded on 0G Galileo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers>
          {/* Flex column inside Providers so the chain is intact regardless of
              what the wallet provider tree adds. min-h-screen on this div
              guarantees the footer is pinned to the viewport bottom even
              when the page content is short. */}
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
