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
    <div className="space-y-6">
      <Link href="/" className="text-[12px] text-[#6b7691] hover:text-[#22d3ee] transition-colors inline-flex items-center gap-1.5">
        <span aria-hidden>←</span> Back to leaderboard
      </Link>

      {/* HERO CARD */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="px-7 py-6 flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[#22d3ee] text-2xl leading-none">◆</span>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0] leading-none">
                Run #{params.id}
              </h1>
              <span className="ml-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#10b98115] border border-[#10b98140] text-[10px] font-medium uppercase tracking-[0.1em] text-[#10b981]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                Attested
              </span>
            </div>
            <div className="text-[12px] text-[#6b7691] flex items-center gap-2 flex-wrap">
              <Link href={`/scenarios/${scenarioId}`} className="text-[#22d3ee] hover:underline">{scenarioId}</Link>
              <span className="text-[#3a4456]">·</span>
              <Link href={`/agents/${run.agentId.toString()}`} className="text-[#22d3ee] hover:underline">Agent #{run.agentId.toString()}</Link>
              <span className="text-[#3a4456]">·</span>
              <span>recorded by <code className="font-mono text-[#aab2c5]">{fmtAddr(run.recordedBy)}</code></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/recipe/${run.recipeHash}`}
              download
              className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Fork recipe <span aria-hidden>↗</span>
            </a>
            <a
              href={`/api/trace/${run.traceHash}`}
              download
              className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#131b2c] border border-[#1c2538] hover:border-[#3d4a6e] text-[#aab2c5] hover:text-[#e6e9f0] px-3.5 py-2 rounded-lg transition-colors"
            >
              Download trace <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-[#1c2538] divide-x divide-[#1c2538]">
          <HeroStat label="Sortino" value={fmtSortino(sortino)} accent={sortino >= 0 ? "up" : "down"} primary />
          <HeroStat label="Total return" value={fmtPct(totalReturn)} accent={totalReturn >= 0 ? "up" : "down"} />
          <HeroStat label="Max drawdown" value={fmtPct(Math.abs(maxDrawdown))} accent="down" />
          <HeroStat label="Scenario ticks" value="100" sub="recorded" />
          <HeroStat
            label="Recorded"
            value={new Date(Number(run.timestamp) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            sub={new Date(Number(run.timestamp) * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          />
        </div>
      </div>

      <ReplayClient traceHash={run.traceHash} scenarioId={scenarioId} />

      {/* ON-CHAIN PROOF */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-3 border-b border-[#1c2538] flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#e6e9f0]">On-chain proof</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691]">{NETWORK}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1c2538]">
          <ProofCell
            label="Run record"
            value={`runId ${params.id}`}
            sub="RunRegistry"
            link={`${EXPLORER}/address/${cfg.contracts.RunRegistry}`}
            linkLabel="View contract"
          />
          <ProofCell
            label="Trace blob"
            value={shortHash(run.traceHash, 10, 6)}
            sub="0G Storage root"
            link={`/api/trace/${run.traceHash}`}
            linkLabel="Download"
          />
          <ProofCell
            label="Recipe hash"
            value={shortHash(run.recipeHash, 10, 6)}
            sub="committed in AgentRegistry"
            link={`${EXPLORER}/address/${cfg.contracts.AgentRegistry}`}
            linkLabel="View contract"
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
  const color = accent === "up" ? "#10b981" : accent === "down" ? "#ef4444" : "#e6e9f0";
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-1.5 font-medium">{label}</div>
      <div className={`flex items-baseline gap-1.5 font-mono ${primary ? "text-[26px]" : "text-[20px]"}`} style={{ color }}>
        {accent === "down" && <span className="text-[12px]">▼</span>}
        {accent === "up" && <span className="text-[12px]">▲</span>}
        <span>{value}</span>
      </div>
      {sub && <div className="text-[11px] text-[#6b7691] mt-1">{sub}</div>}
    </div>
  );
}

function ProofCell({
  label, value, sub, link, linkLabel,
}: { label: string; value: string; sub: string; link: string; linkLabel: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-1.5 font-medium">{label}</div>
      <div className="font-mono text-[14px] text-[#e6e9f0] truncate">{value}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#6b7691]">{sub}</span>
        <a
          href={link}
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-[11px] text-[#22d3ee] hover:underline inline-flex items-center gap-1"
        >
          {linkLabel} <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  );
}

function shortHash(h: string, head = 6, tail = 4): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}
