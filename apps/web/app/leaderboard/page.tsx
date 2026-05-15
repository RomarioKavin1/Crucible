import Link from "next/link";
import { fetchAllRunsV3, fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";
import { buildScenarioHashMap, listScenarios as listLocalScenarios } from "@/lib/scenarios";
import { LeaderboardClient, type V2Row } from "./LeaderboardClient";

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

  const [runs, localScenarios] = await Promise.all([
    fetchAllRunsV3(),
    listLocalScenarios(),
  ]);
  const scenarioHashMap = buildScenarioHashMap(localScenarios.map((s) => s.id));
  const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  const uniqueTokens = new Set(runs.map((r) => r.tokenId)).size;
  const uniqueScenarios = new Set(runs.map((r) => r.scenarioId)).size;

  // Resolve scenario hashes to names once on the server.
  const enriched: V2Row[] = runs.map((r) => ({
    ...r,
    scenarioName: scenarioHashMap.get(r.scenarioId.toLowerCase()) ?? null,
  }));

  return (
    <div className="space-y-6">
      <Header source="v2" />
      <StatsStrip totalRuns={runs.length} totalAgents={uniqueTokens} totalScenarios={uniqueScenarios}
        lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <LeaderboardClient
          rows={enriched}
          scenarios={localScenarios.map((s) => ({ id: s.id, title: s.title }))}
        />
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
            ? "Ranked by Sortino ratio. Every entry is signed by the agent's INFT-authorized wallet and verifiable on-chain."
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
