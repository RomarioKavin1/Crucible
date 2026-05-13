import { fetchAllRuns, filterByScenario, listScenarios } from "@/lib/leaderboard";
import { PerScenarioTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function ScenarioPage({ params }: { params: { id: string } }) {
  const runs = await fetchAllRuns();
  const scenarios = await listScenarios(runs);
  const filtered = filterByScenario(runs, params.id);
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1">Scenario: <code>{params.id}</code></h2>
      <p className="text-sm text-slate-400 mb-4">{filtered.length} run{filtered.length === 1 ? "" : "s"} on this scenario.</p>
      <ScenarioFilterTabs scenarios={scenarios} activeId={params.id} />
      {filtered.length === 0 ? (
        <p className="text-slate-400">No runs yet for this scenario.</p>
      ) : (
        <PerScenarioTable rows={filtered} />
      )}
    </div>
  );
}
