import Link from "next/link";
import { listScenarios, buildScenarioHashMap } from "@/lib/scenarios";
import { fetchAllRunsV3 } from "@/lib/leaderboard";
import { AnimatedScenarioGrid } from "@/components/AnimatedScenarioGrid";

const FEATURED_IDS = ["luna-depeg-hour-1", "btc-flash-crash-dec-2024", "eth-etf-approval"];

export async function FeaturedScenarios() {
  const [all, runs] = await Promise.all([
    listScenarios(),
    fetchAllRunsV3().catch(() => []),
  ]);
  const byId = new Map(all.map((s) => [s.id, s]));
  const featured = FEATURED_IDS.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => s !== undefined);

  const hashMap = buildScenarioHashMap(all.map((s) => s.id));
  const stats = new Map<string, { trials: number; bestSortino: number | null }>();
  for (const r of runs) {
    const name = hashMap.get(r.scenarioId.toLowerCase());
    if (!name) continue;
    const cur = stats.get(name) ?? { trials: 0, bestSortino: null };
    cur.trials += 1;
    cur.bestSortino = cur.bestSortino === null ? r.sortino : Math.max(cur.bestSortino, r.sortino);
    stats.set(name, cur);
  }

  const items = featured.map((s) => {
    const st = stats.get(s.id) ?? { trials: 0, bestSortino: null };
    return {
      id: s.id, title: s.title, asset: s.asset, kind: s.kind,
      durationTicks: s.durationTicks, tickIntervalMs: s.tickIntervalMs,
      previewPoints: s.previewPoints,
      netMovePct: s.netMovePct,
      bestSortino: st.bestSortino,
      trials: st.trials,
      recordedDateLabel: s.kind === "historical" ? new Date(s.windowStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
    };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Featured scenarios</h2>
        <Link href="/scenarios" className="text-[12px] text-[#22d3ee] hover:underline">
          See all {all.length} →
        </Link>
      </div>
      <AnimatedScenarioGrid items={items} />
    </section>
  );
}
