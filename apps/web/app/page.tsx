import { fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function HomePage() {
  const runs = await fetchAllRuns();
  const scenarios = await listScenarios(runs);
  const aggregated = aggregateByAgent(runs);
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Overall standings</h2>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">Leaderboard</h1>
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
