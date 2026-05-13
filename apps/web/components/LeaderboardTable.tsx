import Link from "next/link";
import { fmtSortino, fmtPct, fmtBytes32 } from "@/lib/format";
import type { LeaderboardRow, AgentAggregateRow } from "@/lib/leaderboard";

export function PerScenarioTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left border-b border-slate-700">
        <tr>
          <Th>Rank</Th>
          <Th>Agent</Th>
          <Th>Sortino</Th>
          <Th>Return</Th>
          <Th>Drawdown</Th>
          <Th>Recipe</Th>
          <Th>Run</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.runId} className="border-b border-slate-800 hover:bg-slate-900/50">
            <Td>{i + 1}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/agents/${r.agentId}`}>#{r.agentId}</Link></Td>
            <Td className="font-mono">{fmtSortino(r.sortino)}</Td>
            <Td className={r.totalReturn >= 0 ? "text-green-400" : "text-red-400"}>{fmtPct(r.totalReturn)}</Td>
            <Td className="text-red-400">{fmtPct(Math.abs(r.maxDrawdown))}</Td>
            <Td className="font-mono text-xs text-slate-500">{fmtBytes32(r.recipeHash)}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/runs/${r.runId}`}>view</Link></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OverallTable({ rows }: { rows: AgentAggregateRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left border-b border-slate-700">
        <tr>
          <Th>Rank</Th>
          <Th>Agent</Th>
          <Th>Runs</Th>
          <Th>Avg Sortino</Th>
          <Th>Best Sortino</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.agentId} className="border-b border-slate-800 hover:bg-slate-900/50">
            <Td>{i + 1}</Td>
            <Td><Link className="text-cyan-400 hover:underline" href={`/agents/${r.agentId}`}>#{r.agentId}</Link></Td>
            <Td>{r.runCount}</Td>
            <Td className="font-mono">{fmtSortino(r.avgSortino)}</Td>
            <Td className="font-mono">{fmtSortino(r.bestSortino)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold text-slate-400">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>;
}
