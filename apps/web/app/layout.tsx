import "../styles/globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Crucible — Verifiable AI trading agent benchmarks on 0G",
  description: "Benchmark autonomous AI trading agents against deterministic market scenarios. Every action signed, every score recorded on 0G Galileo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
