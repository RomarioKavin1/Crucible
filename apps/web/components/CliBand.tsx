import Link from "next/link";
import { NPM_BENCH_URL } from "@/lib/links";

/**
 * Editorial invitation band — "Run one yourself." Large mono command block
 * on the right; prose explaining what happens on the left. Three-step micro-
 * checklist as typographic eyebrows underneath.
 *
 * Replaces the previous CliOnboardingCard, which used a tabbed card +
 * step-counter pattern. Editorial register doesn't do wizards.
 */
export function CliBand() {
  return (
    <section className="py-16 md:py-20 border-t border-border-subtle">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10">
        {/* Prose column */}
        <div className="lg:col-span-5">
          <div className="text-eyebrow mb-4">Run one yourself</div>
          <h2 className="text-h2 text-ink max-w-[14ch]">
            Five minutes from npx to leaderboard.
          </h2>
          <p className="mt-6 text-[15px] text-ink-2 leading-relaxed max-w-[52ch]">
            Mint an INFT, generate a delegated runner key (no gas, no funded wallet
            required), pick a provider you already have credentials for. The CLI
            connects to our hosted MCP server, signs every action, and publishes the
            run to <code className="font-mono text-accent">RunRegistryV3</code> when
            it&rsquo;s done.
          </p>

          <ol className="mt-8 space-y-4 max-w-[52ch]">
            <Step
              num="01"
              title="Mint your AgentINFT"
              detail="ERC-7857 token on 0G. One-time, owns the identity."
            />
            <Step
              num="02"
              title="Generate a runner key"
              detail="Delegated hot wallet. Holds zero gas. Pays for nothing."
            />
            <Step
              num="03"
              title="Run the CLI"
              detail="Ticks stream. Trace publishes. Leaderboard updates."
            />
          </ol>

          <div className="mt-10 flex gap-3 flex-wrap">
            <Link
              href="/runbuilder"
              className="inline-flex items-center gap-2 text-[13px] font-medium bg-accent hover:bg-accent-hover text-bg px-5 h-10 rounded transition-colors duration-fast ease-out-quart"
            >
              Open the runbuilder <span aria-hidden>→</span>
            </Link>
            <Link
              href={NPM_BENCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-ink border border-border-subtle hover:border-border-strong px-5 h-10 rounded transition-colors duration-fast ease-out-quart"
            >
              npm page <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>

        {/* Terminal column */}
        <div className="lg:col-span-7 lg:pl-8">
          <div className="surface-inset overflow-hidden">
            {/* fake terminal chrome — kept minimal, no traffic lights */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border-subtle text-[10.5px] text-ink-4 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-pill bg-up" />
              ~/your-agent · macOS
            </div>
            <pre className="p-6 text-[13px] leading-[1.7] font-mono text-ink-2 overflow-x-auto">
              <span className="text-ink-4"># 1. Run a sealed crisis scenario</span>{"\n"}
              <span className="text-up">$</span>{" "}
              <span className="text-ink">npx</span> crucible-bench \{"\n"}
              {"    "}<span className="text-accent">--scenario</span> fakeout-pump \{"\n"}
              {"    "}<span className="text-accent">--provider</span> anthropic \{"\n"}
              {"    "}<span className="text-accent">--watch</span>{"\n\n"}
              <span className="text-ink-4"># pre-flight banner →</span>{"\n"}
              <span className="text-ink-3">  Network:  </span><span className="text-ink">0G Mainnet (16661)</span>{"\n"}
              <span className="text-ink-3">  Signer:   </span><span className="text-ink">0x2414…5532</span>{"\n"}
              <span className="text-ink-3">  Model:    </span><span className="text-ink">claude-haiku-4-5</span>{"\n\n"}
              <span className="text-up">✓</span>{" "}
              <span className="text-ink-2">tick 12/60 · BUY 1.20 ETH</span>{"\n"}
              <span className="text-up">✓</span>{" "}
              <span className="text-ink-2">tick 36/60 · HOLD</span>{"\n"}
              <span className="text-up">✓</span>{" "}
              <span className="text-ink-2">tick 60/60 · done</span>{"\n\n"}
              <span className="text-ink-3">  Sortino: </span>
              <span className="text-up">+1.84</span>{"\n"}
              <span className="text-ink-3">  Run:     </span>
              <span className="text-accent underline underline-offset-2">cruciblebench.xyz/runs/42</span>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ num, title, detail }: { num: string; title: string; detail: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-5">
      <span className="font-mono text-[11px] text-ink-4 pt-1 tracking-tight">{num}</span>
      <div>
        <div className="text-[15px] text-ink font-medium">{title}</div>
        <div className="text-[13px] text-ink-3 mt-0.5">{detail}</div>
      </div>
    </li>
  );
}
