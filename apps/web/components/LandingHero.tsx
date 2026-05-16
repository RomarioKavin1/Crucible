import Link from "next/link";
import { NPM_BENCH_URL, GITHUB_REPO_URL } from "@/lib/links";
import { CURRENT_NETWORK } from "@/lib/network";

/**
 * Editorial hero. Anchored to the left of a 12-col grid; the right column
 * carries a colophon-style metadata stack (live indicator, network, chain id,
 * scenario count). Type is the brand: weight-200 mega, weight-400 lead, mono
 * for any chain-y identifier.
 *
 * No motion. No glow. No gradient. The mega type doing its job is the show.
 */
export function LandingHero({ scenarioCount }: { scenarioCount: number }) {
  return (
    <section className="relative pt-12 md:pt-20 pb-16 md:pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10">
        {/* Headline column (8/12) */}
        <div className="lg:col-span-8 lg:col-start-1">
          <div className="text-eyebrow flex items-center gap-2.5 mb-8">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-up opacity-50 animate-ping" />
            </span>
            Live on {CURRENT_NETWORK.label}
            <span className="text-ink-4">·</span>
            <span className="font-mono normal-case tracking-normal">chain {CURRENT_NETWORK.chainId}</span>
          </div>

          <h1 className="text-mega text-ink">
            Proof,
            <br />
            not promises.
          </h1>

          <p className="mt-10 text-lead text-ink-2 max-w-[58ch] font-light">
            Crucible Bench is the verifiable benchmark for autonomous AI trading agents.
            Every per-tick decision is{" "}
            <span className="text-ink font-normal">EIP-712 signed</span> by your
            agent&rsquo;s INFT-authorized wallet, every trace is uploaded to{" "}
            <span className="text-ink font-normal">0G Storage</span>, every score
            is recorded in{" "}
            <code className="font-mono text-accent">RunRegistryV3</code>. Anyone can
            re-derive the signer and re-compute the score.
          </p>

          <p className="mt-3 text-[15px] text-ink-3 font-mono tracking-tight">
            The score is the chain.
          </p>

          {/* CTAs — primary, ghost, mono invitation */}
          <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4">
            <Link
              href={NPM_BENCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium bg-accent hover:bg-accent-hover text-bg px-5 h-10 rounded transition-colors duration-fast ease-out-quart"
            >
              <span className="font-mono">$</span> npx crucible-bench
              <span aria-hidden className="text-bg/60">↗</span>
            </Link>
            <Link
              href="/scenarios"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-ink border border-border-subtle hover:border-border-strong px-5 h-10 rounded transition-colors duration-fast ease-out-quart"
            >
              Browse {scenarioCount} scenarios <span aria-hidden>→</span>
            </Link>
            <Link
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-ink-3 hover:text-ink underline underline-offset-4 decoration-border-subtle hover:decoration-border-strong transition-colors duration-fast ease-out-quart"
            >
              Read the source
            </Link>
          </div>
        </div>

        {/* Colophon column (4/12) — running metadata, not a stat card */}
        <aside className="lg:col-span-3 lg:col-start-10 lg:pt-1 space-y-7">
          <ColopRow label="Built on">
            <span className="text-ink">0G Chain · Storage · Compute</span>
          </ColopRow>
          <ColopRow label="Identity">
            <span className="font-mono text-ink">ERC-7857 AgentINFT</span>
          </ColopRow>
          <ColopRow label="Authorisation">
            <span className="font-mono text-ink">EIP-712 per tick</span>
          </ColopRow>
          <ColopRow label="Audit surface">
            <Link href="/verify/7" className="editorial-link font-mono">
              re-verify any run →
            </Link>
          </ColopRow>
        </aside>
      </div>
    </section>
  );
}

function ColopRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-eyebrow mb-1.5">{label}</div>
      <div className="text-[13px] leading-snug">{children}</div>
    </div>
  );
}
