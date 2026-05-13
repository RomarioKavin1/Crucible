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
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Agent ID</div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="font-mono text-3xl font-bold text-[#e5e9f0]">◆ #{agentId}</span>
        </div>
        <div className="font-mono text-xs text-[#5e6b80]">owner {fmtAddr(ownerAddr)}</div>
        <div className="grid grid-cols-2 gap-6 mt-6">
          <Stat label="Trials" value={runCount.toString()} />
          <Stat label="Best Sortino" value={fmtSortino(bestSortino)} />
        </div>
      </div>
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-3">Recent runs</h3>
        <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
          {recentRuns.map((r, i) => (
            <Link
              key={r.runId}
              href={`/runs/${r.runId}`}
              className={`block px-4 py-3 hover:border-[#22d3ee44] hover:bg-[#22d3ee06] ${
                i < recentRuns.length - 1 ? "border-b border-[#1f2a3d]" : ""
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[#e5e9f0]">{r.scenarioId}</span>
                <span className="font-mono tabular-nums text-sm" style={{ color: r.sortino >= 0 ? "#10b981" : "#ef4444" }}>
                  {fmtSortino(r.sortino)} {r.sortino >= 0 ? "▲" : "▼"}
                </span>
              </div>
              <div className="font-mono text-[10px] text-[#5e6b80] mt-0.5">return {fmtPct(r.totalReturn)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-1">{label}</div>
      <div className="font-mono text-2xl tabular-nums text-[#e5e9f0]">{value}</div>
    </div>
  );
}
