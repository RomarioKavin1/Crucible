import { NextResponse } from "next/server";
import { fetchAllRuns, filterByScenario } from "@/lib/leaderboard";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scenarioId = url.searchParams.get("scenarioId");
  const runs = await fetchAllRuns();
  const rows = scenarioId ? filterByScenario(runs, scenarioId) : runs;
  return NextResponse.json({ rows });
}
