import { notFound } from "next/navigation";
import Link from "next/link";
import { ScenarioHero } from "@crucible/ui-kit";
import { getScenarioDetail } from "@/lib/scenarios";
import { ScenarioDetailClient } from "./ScenarioDetailClient";
import { RunScenarioButton } from "@/components/RunScenarioButton";

export const revalidate = 300;

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ScenarioDetailPage({ params }: { params: { id: string } }) {
  const scenario = await getScenarioDetail(params.id);
  if (!scenario) notFound();

  return (
    <div className="space-y-6">
      <Link href="/scenarios" className="text-[12px] text-[#6b7691] hover:text-[#22d3ee] inline-flex items-center gap-1.5">
        <span aria-hidden>←</span> Back to scenarios
      </Link>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <ScenarioHero
            title={scenario.title}
            asset={scenario.asset}
            kind={scenario.kind}
            difficulty={scenario.difficulty}
            durationTicks={scenario.durationTicks}
            tickIntervalMs={scenario.tickIntervalMs}
            recordedDateLabel={scenario.kind === "historical" ? dateLabel(scenario.windowStart) : "Synthetic"}
            tags={scenario.tags}
          />
        </div>
        <div className="shrink-0 pt-1">
          <RunScenarioButton scenarioId={scenario.id} scenarioTitle={scenario.title} size="lg" />
        </div>
      </div>

      <ScenarioDetailClient scenario={scenario} />
    </div>
  );
}
