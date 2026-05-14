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
  const avgReturn = recentRuns.length
    ? recentRuns.reduce((s, r) => s + r.totalReturn, 0) / recentRuns.length
    : 0;
  return (
    <div className="space-y-6">
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Agent ID</div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="font-mono text-3xl font-bold text-[#e5e9f0]">◆ #{agentId}</span>
        </div>
        <div className="font-mono text-xs text-[#5e6b80]">owner {fmtAddr(ownerAddr)}</div>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <Stat label="Trials" value={runCount.toString()} />
          <Stat label="Best Sortino" value={fmtSortino(bestSortino)} accent={bestSortino >= 0 ? "up" : "down"} />
          <Stat label="Avg Return" value={fmtPct(avgReturn)} accent={avgReturn >= 0 ? "up" : "down"} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80]">Recent runs</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">
            showing {recentRuns.length}
          </span>
        </div>
        <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
          <div className="grid grid-cols-[60px_1fr_120px_120px_60px] gap-3 px-4 py-2 border-b border-[#1f2a3d] font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">
            <div>Run</div>
            <div>Scenario</div>
            <div className="text-right">Sortino</div>
            <div className="text-right">Return</div>
            <div className="text-right">View</div>
          </div>
          {recentRuns.map((r, i) => (
            <Link
              key={r.runId}
              href={`/runs/${r.runId}`}
              className={`grid grid-cols-[60px_1fr_120px_120px_60px] gap-3 px-4 py-2.5 hover:bg-[#22d3ee06] hover:border-[#22d3ee44] ${
                i < recentRuns.length - 1 ? "border-b border-[#1f2a3d]" : ""
              }`}
            >
              <div className="font-mono text-xs text-[#5e6b80]">#{r.runId}</div>
              <div className="font-mono text-sm text-[#e5e9f0] truncate">{r.scenarioId}</div>
              <div
                className="font-mono tabular-nums text-right text-sm"
                style={{ color: r.sortino >= 0 ? "#10b981" : "#ef4444" }}
              >
                {r.sortino >= 0 ? "▲" : "▼"} {fmtSortino(r.sortino)}
              </div>
              <div
                className="font-mono tabular-nums text-right text-sm"
                style={{ color: r.totalReturn >= 0 ? "#10b981" : "#ef4444" }}
              >
                {fmtPct(r.totalReturn)}
              </div>
              <div className="text-right font-mono text-xs text-[#22d3ee]">↗</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const color = accent === "up" ? "#10b981" : accent === "down" ? "#ef4444" : "#e5e9f0";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-1">{label}</div>
      <div className="font-mono text-2xl tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}
