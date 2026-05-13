import Link from "next/link";
import { ScenarioCard } from "@crucible/ui-kit";
import { listScenarios } from "@/lib/scenarios";

const FEATURED_IDS = ["luna-depeg-hour-1", "btc-flash-crash-dec-2024", "eth-etf-approval"];

export async function FeaturedScenarios() {
  const all = await listScenarios();
  const byId = new Map(all.map((s) => [s.id, s]));
  const featured = FEATURED_IDS.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Featured scenarios</h2>
        <Link href="/scenarios" className="text-[12px] text-[#22d3ee] hover:underline">
          See all {all.length} →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {featured.map((s) => (
          <ScenarioCard
            key={s.id}
            data={{
              id: s.id, title: s.title, asset: s.asset, kind: s.kind,
              durationTicks: s.durationTicks, tickIntervalMs: s.tickIntervalMs,
              previewPoints: s.previewPoints,
              netMovePct: s.netMovePct,
              bestSortino: null, trials: 0,
              recordedDateLabel: s.kind === "historical" ? new Date(s.windowStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
            }}
          />
        ))}
      </div>
    </section>
  );
}
