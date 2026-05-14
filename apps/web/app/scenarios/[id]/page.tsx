import { notFound } from "next/navigation";
import Link from "next/link";
import { ScenarioHero } from "@crucible/ui-kit";
import { getScenarioDetail } from "@/lib/scenarios";
import { ScenarioDetailClient } from "./ScenarioDetailClient";

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

      <ScenarioDetailClient scenario={scenario} />
    </div>
  );
}
