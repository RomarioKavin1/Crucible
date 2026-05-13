import Link from "next/link";
import { fmtAddr, fmtSortino, fmtPct } from "@/lib/format";

export interface AgentCardProps {
  agentId: string;
  ownerAddr: string;
  runCount: number;
  bestSortino: number;
  recentRuns: { runId: string; scenarioId: string; sortino: number; totalReturn: number }[];
}

export function AgentCard({ agentId, ownerAddr, runCount, bestSortino, recentRuns }: AgentCardProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-700 rounded p-6">
        <div className="text-3xl font-mono mb-1">Agent #{agentId}</div>
        <div className="text-sm text-slate-400 mb-4">Owner: <code>{fmtAddr(ownerAddr)}</code></div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Runs" value={runCount.toString()} />
          <Stat label="Best Sortino" value={fmtSortino(bestSortino)} />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Recent runs</h3>
        <ul className="space-y-2">
          {recentRuns.map((r) => (
            <li key={r.runId}>
              <Link href={`/runs/${r.runId}`} className="block bg-slate-900/40 border border-slate-700 rounded p-3 hover:border-cyan-500">
                <div className="flex justify-between items-baseline">
                  <span>{r.scenarioId}</span>
                  <span className="font-mono text-sm">{fmtSortino(r.sortino)}</span>
                </div>
                <div className="text-xs text-slate-500">return {fmtPct(r.totalReturn)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}
