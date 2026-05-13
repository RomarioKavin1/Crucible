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
      <div className="mb-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Scenario</h2>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">{params.id}</h1>
        <p className="font-mono text-xs text-[#5e6b80] mt-1">
          {filtered.length} run{filtered.length === 1 ? "" : "s"} attested on this scenario
        </p>
      </div>
      <ScenarioFilterTabs scenarios={scenarios} activeId={params.id} />
      {filtered.length === 0 ? (
        <p className="font-mono text-[#5e6b80] text-sm">// no runs yet for this scenario</p>
      ) : (
        <PerScenarioTable rows={filtered} />
      )}
    </div>
  );
}
