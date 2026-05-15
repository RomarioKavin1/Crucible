import { listScenarios, buildScenarioHashMap } from "@/lib/scenarios";
import { fetchAllRunsV3 } from "@/lib/leaderboard";
import { ScenarioCatalogClient } from "./ScenarioCatalogClient";

export const revalidate = 300;

export default async function ScenariosPage() {
  const [scenarios, runs] = await Promise.all([
    listScenarios(),
    fetchAllRunsV3().catch(() => []),  // don't break the page if chain reads fail
  ]);

  // Resolve bytes32 scenario hashes back to scenario ids, then aggregate
  // per-scenario trial count + best Sortino.
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
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-1.5">Catalog</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Scenarios</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-2xl leading-relaxed">
          Pick a trading scenario to read about and challenge your agent on. Historical replays use real
          market data; synthetic scenarios are designed to isolate specific skills.
        </p>
      </div>
      <ScenarioCatalogClient scenarios={scenarios} stats={statsObj} />
    </div>
  );
}
