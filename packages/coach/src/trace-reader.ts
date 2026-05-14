import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TraceEntry } from "@crucible/core";

export interface ScorecardFile {
  scenario: string;
  recipe: string;
  scorecard: {
    sortino: number;
    maxDrawdownPct: number;
    totalReturnPct: number;
    winRate: number;
  };
  ticksProcessed: number;
}

export interface LoadedRun {
  runDir: string;
  scenarioId: string;
  recipeName: string;
  entries: TraceEntry[];
  scorecard: ScorecardFile;
}

export async function loadRun(runDir: string): Promise<LoadedRun> {
  const traceRaw = await readFile(path.join(runDir, "trace.jsonl"), "utf8");
  const entries: TraceEntry[] = traceRaw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as TraceEntry);
  const scorecardRaw = await readFile(path.join(runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw) as ScorecardFile;
  return {
    runDir,
    scenarioId: scorecard.scenario,
    recipeName: scorecard.recipe,
    entries,
    scorecard,
  };
}
