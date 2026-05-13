import { getRunRegistry } from "@/lib/chain";
import { fmtSortino, fmtPct, fmtAddr, fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { ethers } from "ethers";
import Link from "next/link";

export const revalidate = 300;

export default async function RunPage({ params }: { params: { id: string } }) {
  const reg = await getRunRegistry();
  const run = await reg.getRun(BigInt(params.id)) as {
    agentId: bigint; scenarioId: string; recipeHash: string; traceHash: string;
    scoreSortinoE6: bigint; totalReturnE6: bigint; maxDrawdownE6: bigint;
    timestamp: bigint; teeAttestation: string; recordedBy: string;
  };
  const scenarioId = ethers.decodeBytes32String(run.scenarioId);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to leaderboard</Link>
        <h2 className="text-2xl font-semibold mt-2">Run #{params.id}</h2>
        <div className="text-sm text-slate-400">
          Scenario: <Link href={`/scenarios/${scenarioId}`} className="text-cyan-400">{scenarioId}</Link>
          {" · "}
          Agent: <Link href={`/agents/${run.agentId.toString()}`} className="text-cyan-400">#{run.agentId.toString()}</Link>
          {" · "}
          By: <code>{fmtAddr(run.recordedBy)}</code>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-3 text-sm flex-1">
          <Metric label="Sortino" value={fmtSortino(fromE6(run.scoreSortinoE6))} />
          <Metric label="Total return" value={fmtPct(fromE6(run.totalReturnE6))} positive={fromE6(run.totalReturnE6) >= 0} />
          <Metric label="Max drawdown" value={fmtPct(Math.abs(fromE6(run.maxDrawdownE6)))} negative />
        </div>
        <a
          href={`/api/recipe/${run.recipeHash}`}
          download
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded text-xs whitespace-nowrap"
        >
          Fork this recipe
        </a>
      </div>
      <ReplayClient traceHash={run.traceHash} scenarioId={scenarioId} />
    </div>
  );
}

function Metric({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const cls = positive ? "text-green-400" : negative ? "text-red-400" : "text-slate-100";
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-mono text-lg ${cls}`}>{value}</div>
    </div>
  );
}
