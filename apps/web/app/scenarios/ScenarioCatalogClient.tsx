"use client";
import { useMemo, useState } from "react";
import { ScenarioCard } from "@crucible/ui-kit";
import { ScenarioFilters, type FilterValue } from "@/components/ScenarioFilters";
import type { ScenarioListEntry } from "@/lib/scenarios";

function dateLabel(entry: ScenarioListEntry): string | undefined {
  if (entry.kind !== "historical") return undefined;
  const d = new Date(entry.windowStart);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ScenarioCatalogClient({
  scenarios,
  stats,
}: {
  scenarios: ScenarioListEntry[];
  stats: Record<string, { trials: number; bestSortino: number | null }>;
}) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return scenarios;
    if (filter === "historical" || filter === "synthetic") {
      return scenarios.filter((s) => s.kind === filter);
    }
    return scenarios.filter((s) => s.asset.toUpperCase().startsWith(filter));
  }, [scenarios, filter]);

  return (
    <div className="space-y-5">
      <ScenarioFilters value={filter} onChange={setFilter} />
      {filtered.length === 0 ? (
        <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center text-[#6b7691] text-[13px]">
          No scenarios match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const st = stats[s.id] ?? { trials: 0, bestSortino: null };
            return (
              <ScenarioCard
                key={s.id}
                data={{
                  id: s.id,
                  title: s.title,
                  asset: s.asset,
                  kind: s.kind,
                  durationTicks: s.durationTicks,
                  tickIntervalMs: s.tickIntervalMs,
                  previewPoints: s.previewPoints,
                  netMovePct: s.netMovePct,
                  bestSortino: st.bestSortino,
                  trials: st.trials,
                  recordedDateLabel: dateLabel(s),
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
