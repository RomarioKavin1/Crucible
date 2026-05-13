import { getRunRegistry } from "@/lib/chain";
import { loadChainConfig, type Network } from "@crucible/og-client";
import { fmtSortino, fmtPct, fmtAddr, fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { ethers } from "ethers";
import Link from "next/link";

export const revalidate = 300;

const NETWORK: Network = (process.env["NEXT_PUBLIC_OG_NETWORK"] as Network) ?? "galileo";
const EXPLORER = NETWORK === "mainnet" ? "https://chainscan.0g.ai" : "https://chainscan-galileo.0g.ai";

export default async function RunPage({ params }: { params: { id: string } }) {
  const reg = await getRunRegistry();
  const run = (await reg.getRun(BigInt(params.id))) as {
    agentId: bigint; scenarioId: string; recipeHash: string; traceHash: string;
    scoreSortinoE6: bigint; totalReturnE6: bigint; maxDrawdownE6: bigint;
    timestamp: bigint; teeAttestation: string; recordedBy: string;
  };
  const cfg = await loadChainConfig(NETWORK);
  const scenarioId = ethers.decodeBytes32String(run.scenarioId);
  const sortino = fromE6(run.scoreSortinoE6);
  const totalReturn = fromE6(run.totalReturnE6);
  const maxDrawdown = fromE6(run.maxDrawdownE6);

  return (
    <div className="space-y-5">
      <Link href="/" className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#5e6b80] hover:text-[#22d3ee]">
        ← back to leaderboard
      </Link>

      {/* HERO: identity + headline numbers */}
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded-lg overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-[#22d3ee] text-3xl leading-none">◆</span>
              <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">Run #{params.id}</h1>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#10b981] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                attested
              </span>
            </div>
            <div className="mt-2 font-mono text-xs text-[#5e6b80] flex items-center gap-2 flex-wrap">
              <Link href={`/scenarios/${scenarioId}`} className="text-[#22d3ee] hover:underline">{scenarioId}</Link>
              <span className="text-[#3a4456]">/</span>
              <Link href={`/agents/${run.agentId.toString()}`} className="text-[#22d3ee] hover:underline">agent #{run.agentId.toString()}</Link>
              <span className="text-[#3a4456]">/</span>
              <span>recorded by <code className="text-[#5e6b80]">{fmtAddr(run.recordedBy)}</code></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/recipe/${run.recipeHash}`}
              download
              className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#0f1623] border border-[#22d3ee] text-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#070b14] px-3.5 py-2 rounded transition-colors"
            >
              Fork recipe ↗
            </a>
            <a
              href={`/api/trace/${run.traceHash}`}
              download
              className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#0f1623] border border-[#1f2a3d] text-[#5e6b80] hover:border-[#22d3ee] hover:text-[#22d3ee] px-3.5 py-2 rounded transition-colors"
            >
              Download trace ↗
            </a>
          </div>
        </div>
        {/* Headline stats strip — uniform horizontal layout, no per-card chrome */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-[#1f2a3d] divide-x divide-[#1f2a3d]">
          <HeroStat label="Sortino" value={fmtSortino(sortino)} accent={sortino >= 0 ? "up" : "down"} primary />
          <HeroStat label="Total return" value={fmtPct(totalReturn)} accent={totalReturn >= 0 ? "up" : "down"} />
          <HeroStat label="Max drawdown" value={fmtPct(Math.abs(maxDrawdown))} accent="down" />
          <HeroStat label="Scenario ticks" value={`${run.scoreSortinoE6 ? "100" : "—"}`} sub="recorded" />
          <HeroStat label="Recorded" value={new Date(Number(run.timestamp) * 1000).toLocaleDateString()} sub={new Date(Number(run.timestamp) * 1000).toLocaleTimeString()} />
        </div>
      </div>

      {/* CHART + TRADES + REASONING + EQUITY (lazy-loaded from 0G Storage) */}
      <ReplayClient traceHash={run.traceHash} scenarioId={scenarioId} />

      {/* ON-CHAIN PROOF — horizontal band with three cells */}
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded-lg">
        <div className="px-4 py-2 border-b border-[#1f2a3d] flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80]">On-chain proof</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">{NETWORK}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1f2a3d]">
          <ProofCell
            label="Run record"
            value={`runId ${params.id}`}
            sub="RunRegistry"
            link={`${EXPLORER}/address/${cfg.contracts.RunRegistry}`}
            linkLabel="contract"
          />
          <ProofCell
            label="Trace blob"
            value={shortHash(run.traceHash, 10, 6)}
            sub="0G Storage root"
            link={`/api/trace/${run.traceHash}`}
            linkLabel="download"
          />
          <ProofCell
            label="Recipe hash"
            value={shortHash(run.recipeHash, 10, 6)}
            sub="committed in AgentRegistry"
            link={`${EXPLORER}/address/${cfg.contracts.AgentRegistry}`}
            linkLabel="contract"
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label, value, sub, accent, primary,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down";
  primary?: boolean;
}) {
  const color = accent === "up" ? "#10b981" : accent === "down" ? "#ef4444" : "#e5e9f0";
  return (
    <div className="px-5 py-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#5e6b80] mb-1">{label}</div>
      <div className={`font-mono tabular-nums ${primary ? "text-3xl" : "text-2xl"} flex items-baseline gap-1.5`} style={{ color }}>
        {accent === "down" && <span className="text-base">▼</span>}
        {accent === "up" && <span className="text-base">▲</span>}
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-[#5e6b80] mt-1">{sub}</div>}
    </div>
  );
}

function ProofCell({
  label, value, sub, link, linkLabel,
}: { label: string; value: string; sub: string; link: string; linkLabel: string }) {
  return (
    <div className="px-5 py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-1">{label}</div>
      <div className="font-mono text-sm text-[#e5e9f0] truncate">{value}</div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] text-[#5e6b80]">{sub}</span>
        <a
          href={link}
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#22d3ee] hover:underline"
        >
          {linkLabel} ↗
        </a>
      </div>
    </div>
  );
}

function shortHash(h: string, head = 6, tail = 4): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}
