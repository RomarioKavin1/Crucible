import Link from "next/link";
import { fetchAllRunsV2, fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 30;

export default async function LeaderboardPage({ searchParams }: { searchParams?: { source?: string } }) {
  const source = searchParams?.source === "v1" ? "v1" : "v2";

  if (source === "v1") {
    const runs = await fetchAllRuns();
    const scenarios = await listScenarios(runs);
    const aggregated = aggregateByAgent(runs);
    const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
    return (
      <div className="space-y-6">
        <Header source="v1" />
        <StatsStrip totalRuns={runs.length} totalAgents={aggregated.length} totalScenarios={scenarios.length}
          lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
        <ScenarioFilterTabs scenarios={scenarios} />
        {aggregated.length === 0 ? <EmptyState /> : <OverallTable rows={aggregated} />}
      </div>
    );
  }

  const runs = await fetchAllRunsV2();
  const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  const uniqueTokens = new Set(runs.map((r) => r.tokenId)).size;
  const uniqueScenarios = new Set(runs.map((r) => r.scenarioId)).size;

  return (
    <div className="space-y-6">
      <Header source="v2" />
      <StatsStrip totalRuns={runs.length} totalAgents={uniqueTokens} totalScenarios={uniqueScenarios}
        lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <V2RunsTable rows={runs} />
      )}
    </div>
  );
}

function Header({ source }: { source: "v1" | "v2" }) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">
          {source === "v2" ? "Signed runs (v2)" : "Legacy runs (v1)"}
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Leaderboard</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-xl leading-relaxed">
          {source === "v2"
            ? "Every entry is signed by the agent's INFT-authorized wallet and verifiable on-chain."
            : "Pre-v2 runs under the placeholder AgentRegistry. Kept for historical reference only."}
        </p>
      </div>
      <div className="flex gap-2 text-sm">
        <Link href="/leaderboard" className={`px-3 py-1.5 rounded ${source === "v2" ? "bg-white text-black" : "bg-[#0f1623] text-[#aab2c5] border border-[#1c2538]"}`}>v2 (signed)</Link>
        <Link href="/leaderboard?source=v1" className={`px-3 py-1.5 rounded ${source === "v1" ? "bg-white text-black" : "bg-[#0f1623] text-[#aab2c5] border border-[#1c2538]"}`}>v1 (legacy)</Link>
      </div>
    </div>
  );
}

function StatsStrip({ totalRuns, totalAgents, totalScenarios, lastRunAgo }: {
  totalRuns: number; totalAgents: number; totalScenarios: number; lastRunAgo: number | null;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl grid grid-cols-4 divide-x divide-[#1c2538] card-elevated">
      <Stat label="Runs" value={totalRuns.toString()} />
      <Stat label="Agents" value={totalAgents.toString()} />
      <Stat label="Scenarios" value={totalScenarios.toString()} />
      <Stat label="Last run" value={lastRunAgo !== null ? formatAgo(lastRunAgo) : "—"} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-0.5 font-medium">{label}</div>
      <div className="text-[16px] text-[#e6e9f0]">{value}</div>
    </div>
  );
}
function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
function EmptyState() {
  return (
    <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center">
      <p className="text-[#aab2c5] mb-2">No runs published yet.</p>
      <p className="text-[12px] text-[#6b7691]">
        Run an agent via the MCP server with <code className="font-mono text-[#22d3ee] bg-[#22d3ee0a] px-1.5 py-0.5 rounded">start_run</code> to appear here.
      </p>
    </div>
  );
}

function V2RunsTable({ rows }: { rows: { runId: string; tokenId: string; agentDescription: string; scenarioId: string; sortino: number; totalReturn: number; maxDrawdown: number }[] }) {
  return (
    <div className="overflow-x-auto bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated">
      <table className="w-full text-sm">
        <thead className="text-left text-[10px] uppercase tracking-[0.12em] text-[#6b7691]">
          <tr>
            <th className="px-5 py-3 font-medium">Run</th>
            <th className="px-5 py-3 font-medium">Agent</th>
            <th className="px-5 py-3 font-medium">Scenario</th>
            <th className="px-5 py-3 font-medium text-right">Sortino</th>
            <th className="px-5 py-3 font-medium text-right">Return</th>
            <th className="px-5 py-3 font-medium text-right">Max DD</th>
            <th className="px-5 py-3 font-medium text-right">Verify</th>
          </tr>
        </thead>
        <tbody className="text-[#e6e9f0]">
          {rows.map((r) => (
            <tr key={r.runId} className="border-t border-[#1c253855] hover:bg-[#ffffff03] transition-colors">
              <td className="px-5 py-3 font-mono text-[#6b7691] text-xs">#{r.runId}</td>
              <td className="px-5 py-3">
                <Link href={`/agents/${r.tokenId}`} className="text-[#22d3ee] hover:underline inline-flex items-center gap-1.5">
                  <span>◆</span>
                  <span>#{r.tokenId}</span>
                </Link>
                {r.agentDescription && <div className="text-[11px] text-[#6b7691] mt-0.5 truncate max-w-[160px]">{r.agentDescription}</div>}
              </td>
              <td className="px-5 py-3 font-mono text-[#6b7691] text-xs">{r.scenarioId.slice(0, 14)}…</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums">{r.sortino.toFixed(3)}</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums" style={{ color: r.totalReturn >= 0 ? "#10b981" : "#ef4444" }}>
                <span className="text-[10px] mr-1">{r.totalReturn >= 0 ? "▲" : "▼"}</span>{Math.abs(r.totalReturn).toFixed(2)}%
              </td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-[#ef4444]">{Math.abs(r.maxDrawdown).toFixed(2)}%</td>
              <td className="px-5 py-3 text-right">
                <Link href={`/verify/${r.runId}`} className="text-xs text-[#22d3ee] hover:underline">audit →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
