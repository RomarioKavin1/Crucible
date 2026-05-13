import Link from "next/link";
import { Sparkline } from "@crucible/ui-kit";
import { fmtSortino, fmtPct, fmtBytes32 } from "@/lib/format";
import type { LeaderboardRow, AgentAggregateRow } from "@/lib/leaderboard";

export function PerScenarioTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
      <div className="grid grid-cols-[40px_1fr_120px_120px_120px_180px_60px] gap-3 px-5 py-3 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
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
          className="grid grid-cols-[40px_1fr_120px_120px_120px_180px_60px] gap-3 px-5 py-3 border-b border-[#1c253855] last:border-0 hover:bg-[#ffffff03] transition-colors"
        >
          <div className="font-mono text-[#6b7691]">{i + 1}</div>
          <div>
            <Link className="text-[14px] font-medium text-[#22d3ee] hover:underline inline-flex items-center gap-1.5" href={`/agents/${r.agentId}`}>
              <span>◆</span>
              <span>#{r.agentId}</span>
            </Link>
            <div className="font-mono text-[11px] text-[#6b7691] mt-0.5">{shortAddr(r.ownerAddr)}</div>
          </div>
          <div className="font-mono text-right text-[#e6e9f0] self-center">{fmtSortino(r.sortino)}</div>
          <div
            className="font-mono text-right self-center"
            style={{ color: r.totalReturn >= 0 ? "#10b981" : "#ef4444" }}
          >
            <span className="text-[10px] mr-1">{r.totalReturn >= 0 ? "▲" : "▼"}</span>{fmtPct(r.totalReturn)}
          </div>
          <div className="font-mono text-right text-[#ef4444] self-center">{fmtPct(Math.abs(r.maxDrawdown))}</div>
          <div className="font-mono text-[12px] text-[#6b7691] truncate self-center">{fmtBytes32(r.recipeHash)}</div>
          <div className="text-right self-center">
            <Link className="text-[12px] text-[#22d3ee] hover:underline" href={`/runs/${r.runId}`}>View ↗</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverallTable({ rows }: { rows: AgentAggregateRow[] }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
      <div className="grid grid-cols-[40px_1fr_80px_140px_140px_120px] gap-3 px-5 py-3 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
        <div>Rank</div>
        <div>Agent</div>
        <div className="text-right">Trials</div>
        <div className="text-right">Avg Sortino</div>
        <div className="text-right">Best</div>
        <div>Trend</div>
      </div>
      {rows.map((r, i) => {
        const direction = r.avgSortino >= 0 ? "▲" : "▼";
        const color = r.avgSortino >= 0 ? "#10b981" : "#ef4444";
        const curve = Array.from({ length: 12 }, (_, j) => r.avgSortino + Math.sin(j / 2 + i) * (r.bestSortino - r.avgSortino + 0.1));
        return (
          <div
            key={r.agentId}
            className="grid grid-cols-[40px_1fr_80px_140px_140px_120px] gap-3 px-5 py-3.5 border-b border-[#1c253855] last:border-0 hover:bg-[#ffffff03] transition-colors items-center"
          >
            <div className="font-mono text-[#6b7691]">#{i + 1}</div>
            <div>
              <Link className="text-[14px] font-medium text-[#22d3ee] hover:underline inline-flex items-center gap-1.5" href={`/agents/${r.agentId}`}>
                <span>◆</span>
                <span>#{r.agentId}</span>
              </Link>
            </div>
            <div className="font-mono text-right text-[#e6e9f0]">{r.runCount}</div>
            <div className="font-mono text-right" style={{ color }}>
              <span className="text-[10px] mr-1">{direction}</span>{fmtSortino(r.avgSortino)}
            </div>
            <div className="font-mono text-right text-[#e6e9f0]">{fmtSortino(r.bestSortino)}</div>
            <div>
              <Sparkline values={curve} color={color} width={100} height={22} />
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
