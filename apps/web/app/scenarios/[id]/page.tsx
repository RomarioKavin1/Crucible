import { notFound } from "next/navigation";
import Link from "next/link";
import { getScenarioDetail } from "@/lib/scenarios";
import { ScenarioDetailClient } from "./ScenarioDetailClient";
import { RunScenarioButton } from "@/components/RunScenarioButton";

export const revalidate = 300;

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function durationLabel(s: { durationTicks: number; tickIntervalMs: number }) {
  const minutes = Math.round((s.durationTicks * s.tickIntervalMs) / 60_000);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export default async function ScenarioDetailPage({ params }: { params: { id: string } }) {
  const scenario = await getScenarioDetail(params.id);
  if (!scenario) notFound();

  return (
    <div className="max-w-container mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-20">
      <Link
        href="/scenarios"
        className="text-[12.5px] text-ink-3 hover:text-accent transition-colors duration-fast ease-out-quart inline-flex items-center gap-1.5"
      >
        <span aria-hidden>←</span> All scenarios
      </Link>

      <header className="mt-8 mb-12 md:mb-16 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-8">
        <div className="lg:col-span-8">
          <div className="text-eyebrow flex items-center gap-2.5 mb-5 flex-wrap">
            <span>{scenario.kind === "historical" ? "Historical replay" : "Synthetic regime"}</span>
            <span className="text-ink-4">·</span>
            <span className="font-mono normal-case tracking-normal">{scenario.asset}</span>
            <span className="text-ink-4">·</span>
            <span className="font-mono normal-case tracking-normal">difficulty {scenario.difficulty}</span>
          </div>

          <h1 className="text-h1 text-ink">{scenario.title}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-2 font-mono">
            <span>{durationLabel(scenario)}</span>
            <span className="text-ink-4">·</span>
            <span>{scenario.durationTicks} ticks</span>
            <span className="text-ink-4">·</span>
            <span>
              {scenario.kind === "historical"
                ? `recorded ${dateLabel(scenario.windowStart)}`
                : "deterministic seed"}
            </span>
          </div>

          {scenario.tags && scenario.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {scenario.tags.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[11px] text-ink-3 border border-border-subtle rounded-pill px-2.5 py-1 tracking-tight"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 lg:flex lg:items-start lg:justify-end lg:pt-1">
          <RunScenarioButton scenarioId={scenario.id} scenarioTitle={scenario.title} size="lg" />
        </div>
      </header>

      <ScenarioDetailClient scenario={scenario} />
    </div>
  );
}
