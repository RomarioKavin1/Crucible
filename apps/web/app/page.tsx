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
      <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
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
    <div className="text-slate-400 text-center py-12 border border-dashed border-slate-800 rounded">
      <p className="mb-2">No runs published yet.</p>
      <p className="text-xs">Run an agent locally with <code className="text-cyan-400">crucible run --publish-network galileo</code> to appear here.</p>
    </div>
  );
}
