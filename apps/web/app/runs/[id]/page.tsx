import { getRunRegistry } from "@/lib/chain";
import { loadChainConfig, type Network } from "@crucible/og-client";
import { fmtSortino, fmtPct, fmtAddr, fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { MetricCard, OnChainProofPanel } from "@crucible/ui-kit";
import { ethers } from "ethers";
import Link from "next/link";

export const revalidate = 300;

const NETWORK: Network = (process.env["NEXT_PUBLIC_OG_NETWORK"] as Network) ?? "galileo";

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
    <div className="space-y-8">
      <div>
        <Link href="/" className="font-mono text-xs text-[#5e6b80] hover:text-[#22d3ee]">
          ← back to leaderboard
        </Link>
        <div className="flex items-start justify-between mt-3 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Run record</div>
            <h1 className="font-mono text-4xl font-bold text-[#e5e9f0] flex items-center gap-3">
              <span className="text-[#22d3ee]">◆</span>
              <span>RUN #{params.id}</span>
            </h1>
            <div className="font-mono text-xs text-[#5e6b80] mt-2 flex items-center gap-2 flex-wrap">
              <span>scenario / <Link href={`/scenarios/${scenarioId}`} className="text-[#22d3ee] hover:underline">{scenarioId}</Link></span>
              <span className="text-[#3a4456]">·</span>
              <span>agent / <Link href={`/agents/${run.agentId.toString()}`} className="text-[#22d3ee] hover:underline">#{run.agentId.toString()}</Link></span>
              <span className="text-[#3a4456]">·</span>
              <span>attested by <code className="text-[#5e6b80]">{fmtAddr(run.recordedBy)}</code></span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={`/api/recipe/${run.recipeHash}`}
              download
              className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#0f1623] border border-[#22d3ee] text-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#070b14] px-4 py-2 rounded transition-colors"
            >
              Fork recipe
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Sortino" value={fmtSortino(sortino)} direction={sortino >= 0 ? "up" : "down"} progress={Math.min(1, Math.abs(sortino))} />
        <MetricCard label="Total Return" value={fmtPct(totalReturn)} direction={totalReturn >= 0 ? "up" : "down"} progress={Math.min(1, Math.abs(totalReturn) * 10)} />
        <MetricCard label="Max Drawdown" value={fmtPct(Math.abs(maxDrawdown))} accent="down" progress={Math.min(1, Math.abs(maxDrawdown) * 10)} />
        <MetricCard label="Attested" value="✓" accent="cyan" />
      </div>

      <ReplayClient
        traceHash={run.traceHash}
        scenarioId={scenarioId}
        proof={
          <OnChainProofPanel
            network={NETWORK}
            runId={params.id}
            agentRegistryAddr={cfg.contracts.AgentRegistry}
            recipeHash={run.recipeHash}
            traceHash={run.traceHash}
          />
        }
      />
    </div>
  );
}
