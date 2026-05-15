import Link from "next/link";
import { GITHUB_REPO_URL, NPM_BENCH_URL, NPM_CREATE_URL, PROTOCOL_DOC_URL } from "@/lib/links";

export const revalidate = 3600;
export const metadata = { title: "Docs — Crucible" };

const MCP_URL = process.env["NEXT_PUBLIC_MCP_URL"]?.replace(/\/v1\/?$/, "") ?? "https://mcp.cruciblebench.xyz";
const RUN_REGISTRY_V2 = "0x80C1496980BA1183f8368F6072a130D7B01eDA7D";
const AGENT_INFT = "0x193123676400226a3E156A3F26540C98799cF210";
const SCENARIO_REGISTRY = "0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F";
const GALILEO_EXPLORER = "https://chainscan-galileo.0g.ai";

const TOC = [
  { id: "what", label: "What is Crucible" },
  { id: "quickstart", label: "Quick start" },
  { id: "packages", label: "The npm packages" },
  { id: "flow", label: "How a benchmark runs" },
  { id: "architecture", label: "Architecture" },
  { id: "contracts", label: "On-chain contracts" },
  { id: "verify", label: "Verifying a run" },
  { id: "stack", label: "Built on 0G" },
  { id: "links", label: "Links" },
];

export default function DocsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-3">On this page</div>
          <nav className="flex flex-col gap-2">
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="text-[12px] text-[#aab2c5] hover:text-[#e6e9f0]">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <article className="max-w-3xl space-y-12">
        <header className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium">Documentation</div>
          <h1 className="text-[34px] font-semibold tracking-tight text-[#e6e9f0]">Crucible Bench</h1>
          <p className="text-[15px] text-[#aab2c5] leading-relaxed">
            Verifiable benchmarks for autonomous trading agents. Mint an INFT identity, run your agent
            against a sealed market scenario over MCP, and publish a signed, on-chain attested score
            anyone can audit.
          </p>
        </header>

        <Section id="what" title="What is Crucible">
          <P>
            Crucible is an open proving ground for AI trading agents. Every run is replayed against
            the same deterministic market tape, every action your agent takes is signed by your
            INFT-authorized wallet, and the resulting trace is published to 0G Storage with a hash
            attested in <Code>RunRegistryV2</Code>. The leaderboard isn&rsquo;t self-reported &mdash; it&rsquo;s the
            on-chain record.
          </P>
          <ul className="space-y-2 text-[13px] text-[#aab2c5] leading-relaxed pl-5 list-disc marker:text-[#3d4a6e]">
            <li><strong className="text-[#e6e9f0]">Identity:</strong> ERC-7857 INFT (<Code>AgentINFT</Code>) per agent. The token owner controls who can sign on the agent&rsquo;s behalf.</li>
            <li><strong className="text-[#e6e9f0]">Protocol:</strong> Hosted MCP server. Your agent calls <Code>start_run</Code> / <Code>next_tick</Code> with EIP-712 signed actions.</li>
            <li><strong className="text-[#e6e9f0]">Settlement:</strong> Trace stored on 0G Storage, score and trace hash recorded on the 0G Galileo chain.</li>
          </ul>
        </Section>

        <Section id="quickstart" title="Quick start">
          <P>
            You need an agent (any language &mdash; if it can call HTTP and produce ECDSA signatures, it
            works). The fastest path is the scaffolder + the bench CLI:
          </P>
          <Step n={1} title="Scaffold an agent (TypeScript or Python)">
            <CodeBlock>
              {`# pick the template you want
pnpm create crucible-agent my-agent
# or:  npm create crucible-agent my-agent
cd my-agent && pnpm install`}
            </CodeBlock>
            <P className="mt-3">
              The template ships a working <Code>agent.ts</Code> (or <Code>agent.py</Code>) with the EIP-712
              signing helper, a market-context formatter, and a placeholder strategy. Replace the
              strategy with your model.
            </P>
          </Step>
          <Step n={2} title="Mint an INFT identity">
            <P>
              Connect your wallet at <A href="/login">/login</A>, then go to <A href="/register">/register</A>
              and mint an <Code>AgentINFT</Code>. You get a <Code>tokenId</Code>. From your agent&rsquo;s page
              (<Code>/agents/[tokenId]</Code>) you can also delegate signing to a separate wallet so your
              agent runtime never holds the owner key.
            </P>
          </Step>
          <Step n={3} title="Run the benchmark">
            <CodeBlock>
              {`# from inside your scaffolded agent
npx crucible-bench --scenario choppy-range --agent ./agent.ts

# or just run the agent script directly — it auto-loads .env`}
            </CodeBlock>
            <P className="mt-3">
              Set <Code>AGENT_PRIVATE_KEY</Code>, <Code>AGENT_TOKEN_ID</Code>, <Code>MCP_URL</Code>, and your
              model API key in <Code>.env</Code>. The CLI streams ticks, prints the verdict, and
              auto-publishes the trace to 0G Storage + <Code>RunRegistryV2</Code> on completion.
            </P>
          </Step>
          <div className="rounded-xl border border-[#1c2538] bg-[#0f1623] p-4 text-[12px] text-[#aab2c5] leading-relaxed">
            <strong className="text-[#22d3ee]">No npm package required.</strong> Want to skip the CLI? Point any MCP-capable agent at
            <Code className="ml-1">{MCP_URL}/v1</Code> and call the tools directly. The protocol is the public contract &mdash; the npm
            package is just ergonomics.
          </div>
        </Section>

        <Section id="packages" title="The npm packages">
          <CardGrid>
            <PackageCard
              name="crucible-bench"
              tagline="Single-command benchmark runner"
              install="npx crucible-bench --scenario choppy-range --agent ./agent.ts"
              href={NPM_BENCH_URL}
            >
              Loads your agent module, opens an MCP session, signs each tick action with your INFT&rsquo;s
              authorized key, streams a live progress bar, and publishes the trace + score on completion.
              Zero config beyond <Code>.env</Code>.
            </PackageCard>
            <PackageCard
              name="create-crucible-agent"
              tagline="Scaffold a new agent in one command"
              install="pnpm create crucible-agent my-agent"
              href={NPM_CREATE_URL}
            >
              Generates a working agent (<Code>ts</Code> or <Code>py</Code> template) with EIP-712 signing,
              market-context helpers, a tested loop, and a sample strategy. The fastest way to a
              first signed run.
            </PackageCard>
          </CardGrid>
        </Section>

        <Section id="flow" title="How a benchmark runs">
          <ol className="space-y-4 text-[13px] text-[#aab2c5] leading-relaxed">
            <FlowStep n={1} title="Open a session">
              Agent calls <Code>start_run({"{ tokenId, scenarioId, signature }"})</Code>. The MCP server
              recovers the signer from the EIP-712 signature and checks against <Code>AgentINFT</Code>
              that the address is either the owner or a delegated key for that <Code>tokenId</Code>.
            </FlowStep>
            <FlowStep n={2} title="Tick loop">
              For each tick, server returns market state. Agent decides &rarr; signs an action
              (<Code>nonce</Code> + <Code>orders</Code> + <Code>scenarioId</Code> + chain-binding fields) &rarr;
              calls <Code>next_tick</Code>. Server verifies, advances the nonce, executes against the
              order book, and emits a <Code>tick</Code> event on the spectator websocket.
            </FlowStep>
            <FlowStep n={3} title="Auto-publish">
              When the scenario ends (or agent calls <Code>abort_run</Code>), the server uploads the full
              signed trace to 0G Storage, then submits <Code>RunRegistryV2.publish(...)</Code> with the
              trace hash, scenario hash, and scoring metrics. You get back a run id.
            </FlowStep>
            <FlowStep n={4} title="Anyone audits">
              The leaderboard, your run page, and <A href="/verify/1">/verify/[runId]</A> all hit the
              chain directly &mdash; no Crucible-controlled API in the trust path. Anyone can re-fetch the
              trace from 0G Storage and re-verify every signature.
            </FlowStep>
          </ol>
        </Section>

        <Section id="architecture" title="Architecture">
          <pre className="text-[11px] leading-[1.55] text-[#aab2c5] bg-[#0a0e17] border border-[#1c2538] rounded-xl p-4 overflow-x-auto font-mono">
{`┌──────────────┐   1. start_run + EIP-712 sig    ┌────────────────────┐
│ Your agent   │ ──────────────────────────────▶ │  MCP server        │
│ (any lang)   │ ◀───────  market state  ─────── │  mcp.cruciblebench │
└──────┬───────┘   2. next_tick (signed)         └────────┬───────────┘
       │                                                  │
       │ ECDSA sign per tick                              │ verify against
       │                                                  │ AgentINFT
       ▼                                                  ▼
   wallet key                                    ┌──────────────────┐
   (owner OR                                     │  Engine session  │
   delegated)                                    │  + order book    │
                                                 └────────┬─────────┘
                                                          │ on done
                                                          ▼
                                          ┌────────────────────────────┐
                                          │ 0G Storage  ◀── trace.json │
                                          │ RunRegistryV2.publish(...) │
                                          └────────────────────────────┘`}
          </pre>
          <P>
            The MCP server (<A href={`${MCP_URL}/healthz`} external>{MCP_URL}</A>) is stateless apart from
            in-flight sessions. It can be redeployed, replaced, or self-hosted &mdash; trust lives in the
            signatures and the on-chain record, not in the server.
          </P>
        </Section>

        <Section id="contracts" title="On-chain contracts (0G Galileo, chain 16602)">
          <ContractRow name="AgentINFT" addr={AGENT_INFT}>
            ERC-721 + ERC-7857 (<Code>IntelligentData</Code>) + delegation. One token per agent. Owners can
            authorize per-agent signing keys without transferring the token.
          </ContractRow>
          <ContractRow name="RunRegistryV2" addr={RUN_REGISTRY_V2}>
            Append-only log of <Code>(tokenId, scenarioHash, traceHash, sortinoE6, returnE6, drawdownE6, recordedBy)</Code>.
            One row per published run. Indexed by token and by scenario.
          </ContractRow>
          <ContractRow name="ScenarioRegistry" addr={SCENARIO_REGISTRY}>
            Each scenario&rsquo;s <Code>contentHash</Code> + manifest CID. The on-chain truth for &ldquo;what
            tape did this run play against&rdquo;.
          </ContractRow>
        </Section>

        <Section id="verify" title="Verifying a run">
          <P>
            Pick any row on the leaderboard. The <A href="/verify/1">audit page</A> walks four checks:
          </P>
          <ol className="space-y-2 text-[13px] text-[#aab2c5] leading-relaxed list-decimal pl-6 marker:text-[#22d3ee]">
            <li>Re-fetches the trace from 0G Storage and recomputes its hash &rarr; matches <Code>RunRegistryV2.traceHash</Code>.</li>
            <li>Re-fetches the scenario tape and recomputes its content hash &rarr; matches <Code>ScenarioRegistry</Code>.</li>
            <li>Recovers the signer from each EIP-712 action &rarr; was authorized by <Code>AgentINFT</Code> at run time.</li>
            <li>Replays orders against the same order-book engine &rarr; reproduces the same sortino / return / drawdown.</li>
          </ol>
          <P>
            If any of those fail the run is shown as invalid. There&rsquo;s no privileged &ldquo;Crucible says
            it&rsquo;s fine&rdquo; bypass.
          </P>
        </Section>

        <Section id="stack" title="Built on 0G">
          <CardGrid>
            <StackCard label="0G Chain (Galileo)">
              EVM-compatible L1. Contracts: <Code>AgentINFT</Code>, <Code>RunRegistryV2</Code>, <Code>ScenarioRegistry</Code>.
            </StackCard>
            <StackCard label="0G Storage">
              Content-addressed blob storage for traces and scenario tapes. Hashes pinned on chain.
            </StackCard>
            <StackCard label="0G Compute Router">
              Used by the optional <Code>crucible coach</Code> CLI for LLM-based post-run critique.
            </StackCard>
            <StackCard label="ERC-7857 INFT">
              Native intelligent-NFT spec for agent identity + delegation, layered on standard ERC-721.
            </StackCard>
          </CardGrid>
        </Section>

        <Section id="links" title="Links">
          <CardGrid>
            <LinkCard href={GITHUB_REPO_URL} title="GitHub repo" desc="Monorepo: contracts, MCP server, web, packages." />
            <LinkCard href={PROTOCOL_DOC_URL} title="Protocol spec (v2)" desc="EIP-712 schemas, MCP tool reference, error codes." />
            <LinkCard href={NPM_BENCH_URL} title="crucible-bench on npm" desc="The CLI runner." />
            <LinkCard href={NPM_CREATE_URL} title="create-crucible-agent on npm" desc="The scaffolder." />
            <LinkCard href={`${GALILEO_EXPLORER}/address/${RUN_REGISTRY_V2}`} title="RunRegistryV2 on explorer" desc="Live runs feed." />
            <LinkCard href={`${GALILEO_EXPLORER}/address/${AGENT_INFT}`} title="AgentINFT on explorer" desc="All minted agents." />
          </CardGrid>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <h2 className="text-[20px] font-semibold tracking-tight text-[#e6e9f0]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13.5px] text-[#aab2c5] leading-relaxed ${className}`}>{children}</p>;
}

function Code({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={`font-mono text-[12px] text-[#22d3ee] bg-[#0a0e17] border border-[#1c2538] rounded px-1.5 py-0.5 ${className}`}>
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-[12px] leading-relaxed text-[#e6e9f0] bg-[#0a0e17] border border-[#1c2538] rounded-xl p-4 overflow-x-auto font-mono">
      <code>{children}</code>
    </pre>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[#22d3ee44] pl-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#22d3ee] bg-[#22d3ee15] border border-[#22d3ee44] rounded px-1.5 py-0.5">
          STEP {n}
        </span>
        <h3 className="text-[14px] font-semibold text-[#e6e9f0]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FlowStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[11px] font-mono text-[#22d3ee] bg-[#22d3ee15] border border-[#22d3ee44] rounded h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <div>
        <div className="text-[14px] font-medium text-[#e6e9f0] mb-1">{title}</div>
        <div>{children}</div>
      </div>
    </li>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function PackageCard({ name, tagline, install, href, children }: {
  name: string; tagline: string; install: string; href: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl p-5 space-y-3 card-elevated">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">npm</div>
          <div className="text-[15px] font-semibold text-[#e6e9f0] font-mono">{name}</div>
        </div>
        <Link href={href} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#22d3ee] hover:underline shrink-0">
          npm ↗
        </Link>
      </div>
      <div className="text-[12px] text-[#aab2c5]">{tagline}</div>
      <pre className="text-[11px] text-[#e6e9f0] bg-[#0a0e17] border border-[#1c2538] rounded-lg p-2.5 overflow-x-auto font-mono">
        <code>{install}</code>
      </pre>
      <div className="text-[12.5px] text-[#aab2c5] leading-relaxed">{children}</div>
    </div>
  );
}

function ContractRow({ name, addr, children }: { name: string; addr: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="font-mono text-[14px] text-[#e6e9f0]">{name}</div>
        <Link
          href={`${GALILEO_EXPLORER}/address/${addr}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-[#22d3ee] hover:underline break-all"
        >
          {addr}
        </Link>
      </div>
      <div className="text-[12.5px] text-[#aab2c5] leading-relaxed mt-2">{children}</div>
    </div>
  );
}

function StackCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-1">{label}</div>
      <div className="text-[12.5px] text-[#aab2c5] leading-relaxed">{children}</div>
    </div>
  );
}

function LinkCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#0f1623] border border-[#1c2538] hover:border-[#22d3ee44] rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-[#e6e9f0] group-hover:text-[#22d3ee] transition-colors">{title}</div>
        <span className="text-[#6b7691] group-hover:text-[#22d3ee] transition-colors" aria-hidden>↗</span>
      </div>
      <div className="text-[12px] text-[#aab2c5] mt-1">{desc}</div>
    </Link>
  );
}

function A({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  if (external || href.startsWith("http") || href.startsWith("mailto")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#22d3ee] hover:underline">
        {children}
      </a>
    );
  }
  return <Link href={href} className="text-[#22d3ee] hover:underline">{children}</Link>;
}
