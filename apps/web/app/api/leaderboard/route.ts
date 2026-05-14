import { NextResponse } from "next/server";
import { fetchAllRuns, filterByScenario, fetchRunsByScenarioV2 } from "@/lib/leaderboard";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scenarioId = url.searchParams.get("scenarioId");
  const source = url.searchParams.get("source");

  if (source === "v2" && scenarioId) {
    const rows = await fetchRunsByScenarioV2(scenarioId);
    return NextResponse.json({ rows, source: "v2" });
  }

  const runs = await fetchAllRuns();
  const rows = scenarioId ? filterByScenario(runs, scenarioId) : runs;
  return NextResponse.json({ rows, source: "v1" });
}
