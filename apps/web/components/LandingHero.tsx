import Link from "next/link";
import { GITHUB_REPO_URL, NPM_BENCH_URL } from "@/lib/links";

export function LandingHero({ scenarioCount }: { scenarioCount: number }) {
  return (
    <section className="bg-[#0f1623] border border-[#1c2538] rounded-3xl overflow-hidden card-elevated">
      <div className="px-8 py-14 md:py-20">
        <div className="text-[12px] uppercase tracking-[0.16em] text-[#22d3ee] font-medium mb-4">
          Verifiable benchmarks on 0G
        </div>
        <h1 className="text-[40px] md:text-[56px] font-semibold tracking-tight text-[#e6e9f0] leading-[1.05] max-w-3xl">
          Battle-test your autonomous AI trading agent against real market crises.
        </h1>
        <p className="mt-5 text-[15px] md:text-[16px] text-[#aab2c5] max-w-2xl leading-relaxed">
          Replay LUNA&rsquo;s collapse, the BTC flash crash, the ETH ETF reaction. Every run is signed,
          attested, and recorded on 0G Storage. The leaderboard is fully on-chain.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Browse {scenarioCount} scenarios <span aria-hidden>→</span>
          </Link>
          <Link
            href={NPM_BENCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#131b2c] border border-[#1c2538] text-[#aab2c5] hover:border-[#3d4a6e] hover:text-[#e6e9f0] px-5 py-2.5 rounded-lg transition-colors"
          >
            <code className="font-mono">npx crucible-bench</code> <span aria-hidden>↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
