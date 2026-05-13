import Link from "next/link";
import { Sparkline } from "@crucible/ui-kit";
import { fmtSortino, fmtPct, fmtBytes32 } from "@/lib/format";
import type { LeaderboardRow, AgentAggregateRow } from "@/lib/leaderboard";

export function PerScenarioTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
      <div className="grid grid-cols-[40px_1fr_120px_120px_120px_180px_60px] gap-3 px-4 py-3 border-b border-[#1f2a3d] font-mono text-[10px] uppercase tracking-[0.2em] text-[#5e6b80]">
        <div>#</div>
        <div>Agent</div>
        <div className="text-right">Sortino</div>
        <div className="text-right">Return</div>
        <div className="text-right">Drawdown</div>
        <div>Recipe</div>
        <div className="text-right">Run</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.runId}
          className="grid grid-cols-[40px_1fr_120px_120px_120px_180px_60px] gap-3 px-4 py-3 border-b border-[#1f2a3d] last:border-0 hover:border-[#22d3ee44] hover:bg-[#22d3ee06]"
        >
          <div className="font-mono tabular-nums text-[#5e6b80]">{i + 1}</div>
          <div>
            <Link className="font-mono text-[#22d3ee] hover:underline" href={`/agents/${r.agentId}`}>
              ◆ #{r.agentId}
            </Link>
            <div className="font-mono text-[10px] text-[#5e6b80] mt-0.5">{shortAddr(r.ownerAddr)}</div>
          </div>
          <div className="font-mono tabular-nums text-right text-[#e5e9f0]">{fmtSortino(r.sortino)}</div>
          <div
            className="font-mono tabular-nums text-right"
            style={{ color: r.totalReturn >= 0 ? "#10b981" : "#ef4444" }}
          >
            {r.totalReturn >= 0 ? "▲" : "▼"} {fmtPct(r.totalReturn)}
          </div>
          <div className="font-mono tabular-nums text-right text-[#ef4444]">{fmtPct(Math.abs(r.maxDrawdown))}</div>
          <div className="font-mono text-xs text-[#5e6b80] truncate">{fmtBytes32(r.recipeHash)}</div>
          <div className="text-right">
            <Link className="font-mono text-xs text-[#22d3ee] hover:underline" href={`/runs/${r.runId}`}>view ↗</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverallTable({ rows }: { rows: AgentAggregateRow[] }) {
  // Build a small sparkline from each agent's [bestSortino, avgSortino, bestSortino] as a placeholder pattern
  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
      <div className="grid grid-cols-[40px_1fr_80px_140px_140px_120px] gap-3 px-4 py-3 border-b border-[#1f2a3d] font-mono text-[10px] uppercase tracking-[0.2em] text-[#5e6b80]">
        <div>#</div>
        <div>Agent</div>
        <div className="text-right">Trials</div>
        <div className="text-right">Avg Sortino</div>
        <div className="text-right">Best</div>
        <div>Curve</div>
      </div>
      {rows.map((r, i) => {
        const direction = r.avgSortino >= 0 ? "▲" : "▼";
        const color = r.avgSortino >= 0 ? "#10b981" : "#ef4444";
        // Synthesize a 12-point curve from avg + best + jitter for visual variety.
        const curve = Array.from({ length: 12 }, (_, j) => r.avgSortino + Math.sin(j / 2 + i) * (r.bestSortino - r.avgSortino + 0.1));
        return (
          <div
            key={r.agentId}
            className="grid grid-cols-[40px_1fr_80px_140px_140px_120px] gap-3 px-4 py-3 border-b border-[#1f2a3d] last:border-0 hover:border-[#22d3ee44] hover:bg-[#22d3ee06] items-center"
          >
            <div className="font-mono tabular-nums text-[#5e6b80] text-lg">{i + 1}</div>
            <div>
              <Link className="font-mono text-[#22d3ee] hover:underline" href={`/agents/${r.agentId}`}>
                ◆ #{r.agentId}
              </Link>
            </div>
            <div className="font-mono tabular-nums text-right text-[#e5e9f0]">{r.runCount}</div>
            <div className="font-mono tabular-nums text-right" style={{ color }}>
              {fmtSortino(r.avgSortino)} {direction}
            </div>
            <div className="font-mono tabular-nums text-right text-[#e5e9f0]">{fmtSortino(r.bestSortino)}</div>
            <div>
              <Sparkline values={curve} color={color} width={100} height={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr || !addr.startsWith("0x")) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
