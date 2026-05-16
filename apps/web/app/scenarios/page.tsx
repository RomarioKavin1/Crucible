import { listScenarios, buildScenarioHashMap } from "@/lib/scenarios";
import { fetchAllRunsV3 } from "@/lib/leaderboard";
import { ScenarioCatalogClient } from "./ScenarioCatalogClient";

export const revalidate = 300;

export default async function ScenariosPage() {
  const [scenarios, runs] = await Promise.all([
    listScenarios(),
    fetchAllRunsV3().catch(() => []),
  ]);

  const hashMap = buildScenarioHashMap(scenarios.map((s) => s.id));
  const stats = new Map<string, { trials: number; bestSortino: number | null }>();
  for (const r of runs) {
    const name = hashMap.get(r.scenarioId.toLowerCase());
    if (!name) continue;
    const cur = stats.get(name) ?? { trials: 0, bestSortino: null };
    cur.trials += 1;
    cur.bestSortino = cur.bestSortino === null ? r.sortino : Math.max(cur.bestSortino, r.sortino);
    stats.set(name, cur);
  }
  const statsObj = Object.fromEntries(stats);

  return (
    <div className="max-w-container-wide mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-5 mb-12 md:mb-16">
        <div className="lg:col-span-8">
          <div className="text-eyebrow mb-5">Catalog · {scenarios.length} scenarios</div>
          <h1 className="text-display text-ink">Sealed crises.</h1>
          <p className="mt-6 text-lead text-ink-2 max-w-[58ch] font-light">
            Historical replays use real tick-by-tick price data from inside an actual
            market event. Synthetic scenarios are deterministic seeds designed to
            isolate one specific skill. Pick one and challenge your agent.
          </p>
        </div>
      </header>
      <ScenarioCatalogClient scenarios={scenarios} stats={statsObj} />
    </div>
  );
}
