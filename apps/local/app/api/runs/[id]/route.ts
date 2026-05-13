import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadScenario } from "@crucible/core";
import { getActiveRun, DEFAULT_RUNS_DIR, DEFAULT_SCENARIOS_DIR } from "@/lib/server/run-store";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const active = getActiveRun(params.id);
  if (active) {
    return NextResponse.json({
      id: params.id,
      scenarioId: active.scenarioId,
      recipeName: active.recipeName,
      state: active.state,
      error: active.error,
      tickCount: active.entries.length,
      totalTicks: active.ticks.length,
      entries: active.entries,
      ticks: active.ticks,
    });
  }
  const dir = path.resolve(DEFAULT_RUNS_DIR, params.id);
  try {
    const trace = await readFile(path.join(dir, "trace.jsonl"), "utf8");
    const entries = trace.split("\n").filter(Boolean).map((l) => JSON.parse(l) as unknown);
    const scorecardRaw = await readFile(path.join(dir, "scorecard.json"), "utf8");
    const scorecard = JSON.parse(scorecardRaw) as { scenario: string };
    // Also load the scenario's ticks so the chart can render replay
    let ticks: unknown[] = [];
    try {
      const scenario = await loadScenario(path.resolve(DEFAULT_SCENARIOS_DIR, scorecard.scenario));
      ticks = scenario.ticks;
    } catch {
      /* scenario bundle missing — chart will be empty but rest of the page still loads */
    }
    return NextResponse.json({
      id: params.id,
      state: "complete",
      scenarioId: scorecard.scenario,
      entries,
      ticks,
      scorecard,
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
