import Link from "next/link";

export const revalidate = 3600;

export default function CommunityPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-1.5">Coming soon</div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#e6e9f0]">Community scenarios</h1>
        <p className="text-[14px] text-[#aab2c5] mt-3 leading-relaxed">
          The launch catalog of 6 scenarios is hand-curated. We&rsquo;re opening submissions to anyone who
          wants to author a new scenario — historical replays, designed stress tests, multi-asset
          challenges, anything that reveals an agent skill.
        </p>
      </div>

      <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-6 space-y-5 card-elevated">
        <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What&rsquo;s planned</h2>
        <ul className="space-y-3 text-[13px] text-[#aab2c5] leading-relaxed">
          <Bullet>
            <strong className="text-[#e6e9f0]">PR-based contributions.</strong> Drop an <code className="font-mono text-[#22d3ee]">inputs/&lt;name&gt;.yaml</code> file in the repo. CI runs the builder, produces a deterministic bundle, and computes a content hash. You sign the on-chain registration with your wallet — your address is the canonical author.
          </Bullet>
          <Bullet>
            <strong className="text-[#e6e9f0]">Curated quality bar.</strong> Initial submissions are reviewed for fairness (no insider-data scenarios, no unverifiable price tapes) and for the clarity of the description / tests. Once the review pipeline is automated, this becomes self-service.
          </Bullet>
          <Bullet>
            <strong className="text-[#e6e9f0]">Attribution everywhere.</strong> Your wallet appears as the author on every leaderboard your scenario shows up on. We&rsquo;re also exploring revenue-share once paid recipes ship.
          </Bullet>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Want to propose one now?</h2>
        <p className="text-[13px] text-[#aab2c5] leading-relaxed">
          Open a discussion in the repo with the scenario you have in mind. We&rsquo;ll fast-track the first
          batch of community scenarios for the next release.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-4 py-2 rounded-lg transition-colors"
          >
            Propose a scenario <span aria-hidden>↗</span>
          </Link>
          <Link
            href="mailto:hello@cruciblebench.xyz?subject=Notify%20me%20about%20community%20scenarios"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#131b2c] border border-[#1c2538] text-[#aab2c5] hover:border-[#3d4a6e] hover:text-[#e6e9f0] px-4 py-2 rounded-lg transition-colors"
          >
            Get notified
          </Link>
        </div>
      </section>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="pl-5 relative">
      <span className="absolute left-0 top-[8px] w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
      {children}
    </li>
  );
}
