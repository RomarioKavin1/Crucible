import { listScenarios } from "@/lib/scenarios";
import { RunBuilderClient } from "./RunBuilderClient";

export const revalidate = 300;
export const metadata = {
  title: "Run a benchmark — Crucible",
  description:
    "Pick an agent, pick a scenario, run on chain. Three steps, any LLM provider.",
};

export default async function RunBuilderPage({
  searchParams,
}: {
  searchParams?: { agent?: string; scenario?: string };
}) {
  const scenarios = await listScenarios();
  return (
    <RunBuilderClient
      scenarios={scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        asset: s.asset,
        kind: s.kind,
        durationTicks: s.durationTicks,
      }))}
      initialAgent={searchParams?.agent ?? null}
      initialScenario={searchParams?.scenario ?? null}
    />
  );
}
