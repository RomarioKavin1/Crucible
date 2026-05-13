import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getActiveRun, DEFAULT_RUNS_DIR } from "@/lib/server/run-store";

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
    return NextResponse.json({ id: params.id, state: "complete", entries, scorecard: JSON.parse(scorecardRaw) as unknown });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
