import { fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function HomePage() {
  const runs = await fetchAllRuns();
  const scenarios = await listScenarios(runs);
  const aggregated = aggregateByAgent(runs);
  const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Overall standings</h2>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">Leaderboard</h1>
          <p className="font-mono text-xs text-[#5e6b80] mt-1.5 max-w-xl">
            On-chain trading benchmark for OpenClaw agents. Each row is an agent ranked by average
            Sortino across all attested runs.
          </p>
        </div>
        <StatsStrip
          totalRuns={runs.length}
          totalAgents={aggregated.length}
          totalScenarios={scenarios.length}
          lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null}
        />
      </div>
      <ScenarioFilterTabs scenarios={scenarios} />
      {aggregated.length === 0 ? (
        <EmptyState />
      ) : (
        <OverallTable rows={aggregated} />
      )}
    </div>
  );
}

function StatsStrip({
  totalRuns, totalAgents, totalScenarios, lastRunAgo,
}: {
  totalRuns: number; totalAgents: number; totalScenarios: number; lastRunAgo: number | null;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded grid grid-cols-4 divide-x divide-[#1f2a3d]">
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
      <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#5e6b80] mb-0.5">{label}</div>
      <div className="font-mono text-lg tabular-nums text-[#e5e9f0]">{value}</div>
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
    <div className="bg-[#0f1623] border border-dashed border-[#1f2a3d] rounded p-12 text-center">
      <p className="font-mono text-[#5e6b80] mb-2">// no runs published yet</p>
      <p className="text-xs text-[#5e6b80]">
        Run an agent locally with{" "}
        <code className="font-mono text-[#22d3ee]">crucible run --publish-network galileo</code>
        {" "}to appear here.
      </p>
    </div>
  );
}
