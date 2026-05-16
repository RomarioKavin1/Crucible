"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ScenarioListEntry } from "@/lib/scenarios";
import { fmtSortino } from "@/lib/format";

type FilterValue = "all" | "historical" | "synthetic" | "BTC" | "ETH" | "SOL";

const FILTERS: { id: FilterValue; label: string }[] = [
  { id: "all", label: "All" },
  { id: "historical", label: "Historical" },
  { id: "synthetic", label: "Synthetic" },
  { id: "BTC", label: "BTC" },
  { id: "ETH", label: "ETH" },
  { id: "SOL", label: "SOL" },
];

function dateLabel(entry: ScenarioListEntry): string | undefined {
  if (entry.kind !== "historical") return undefined;
  const d = new Date(entry.windowStart);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function durationLabel(s: { durationTicks: number; tickIntervalMs: number }) {
  const minutes = Math.round((s.durationTicks * s.tickIntervalMs) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

/**
 * Editorial scenario list. No card grid — typographic list with hairlines.
 * Numerical right-rail: best Sortino + trial count, both right-aligned mono.
 */
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
    <div className="space-y-8">
      {/* Filter strip — editorial text buttons */}
      <div className="flex items-baseline gap-5 flex-wrap">
        <span className="text-eyebrow w-14 shrink-0">Filter</span>
        <div className="flex items-baseline gap-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-[13px] transition-colors duration-fast ease-out-quart ${
                filter === f.id
                  ? "text-ink font-medium underline underline-offset-4 decoration-accent decoration-2"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-hatch border border-dashed border-border-subtle rounded p-16 text-center text-ink-3 text-[13px]">
          No scenarios match this filter.
        </div>
      ) : (
        <ul className="border-t border-border-subtle">
          {filtered.map((s, idx) => {
            const st = stats[s.id] ?? { trials: 0, bestSortino: null };
            const dateStr = dateLabel(s);
            return (
              <li key={s.id} className="border-b border-border-subtle">
                <Link
                  href={`/scenarios/${s.id}`}
                  className="group block py-7 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-3 hover:bg-surface-1/40 -mx-5 px-5 md:-mx-8 md:px-8 transition-colors duration-fast ease-out-quart"
                >
                  <div className="lg:col-span-1 font-mono text-[11px] text-ink-4 tracking-tight pt-1">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  <div className="lg:col-span-7 space-y-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h3 className="text-h3 text-ink group-hover:text-accent transition-colors duration-fast ease-out-quart">
                        {s.title}
                      </h3>
                      <span className="text-eyebrow">{s.asset}</span>
                      <span className={`text-[10.5px] font-mono ${s.kind === "historical" ? "text-ink-3" : "text-ink-4"}`}>
                        {s.kind}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3 font-mono">
                      <span>{durationLabel(s)}</span>
                      {s.netMovePct !== undefined && (
                        <span>net move {(s.netMovePct * 100).toFixed(1)}%</span>
                      )}
                      {dateStr && <span>{dateStr}</span>}
                    </div>
                  </div>

                  <div className="lg:col-span-4 lg:text-right space-y-2 self-start">
                    <div>
                      <div className="text-eyebrow">Best Sortino</div>
                      <div
                        className={`font-mono text-[22px] tabular-nums tracking-tight ${
                          st.bestSortino === null
                            ? "text-ink-3"
                            : st.bestSortino >= 0
                            ? "text-up"
                            : "text-down"
                        }`}
                      >
                        {st.bestSortino === null ? "—" : fmtSortino(st.bestSortino)}
                      </div>
                    </div>
                    <div className="text-[12px] text-ink-3">
                      {st.trials === 0 ? "no runs yet" : `${st.trials} ${st.trials === 1 ? "trial" : "trials"}`}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
