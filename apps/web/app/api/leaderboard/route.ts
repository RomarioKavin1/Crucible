import { NextResponse } from "next/server";
import { fetchAllRuns, filterByScenario, fetchAllRunsV2, fetchRunsByScenarioV2 } from "@/lib/leaderboard";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scenarioId = url.searchParams.get("scenarioId");
  const source = url.searchParams.get("source");

  // Legacy v1 path — opt-in with ?source=v1
  if (source === "v1") {
    const runs = await fetchAllRuns();
    const rows = scenarioId ? filterByScenario(runs, scenarioId) : runs;
    return NextResponse.json({ rows, source: "v1" });
  }

  // Default: v2 (RunRegistryV2)
  if (scenarioId) {
    const rows = await fetchRunsByScenarioV2(scenarioId);
    return NextResponse.json({ rows, source: "v2" });
  }

  const rows = await fetchAllRunsV2();
  return NextResponse.json({ rows, source: "v2" });
}
