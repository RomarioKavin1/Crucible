import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Tick, TraceEntry } from "@crucible/core";

export interface RunSummary {
  id: string;
  scenario: string;
  recipe: string;
  createdAt: number;
}

export async function listRunsFromDisk(outDir: string): Promise<RunSummary[]> {
  let entries: string[];
  try {
    entries = await readdir(outDir);
  } catch {
    return [];
  }
  const summaries: RunSummary[] = [];
  for (const id of entries) {
    const dir = path.join(outDir, id);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
      const scoreRaw = await readFile(path.join(dir, "scorecard.json"), "utf8");
      const sc = JSON.parse(scoreRaw) as { scenario: string; recipe: string };
      summaries.push({ id, scenario: sc.scenario, recipe: sc.recipe, createdAt: s.mtimeMs });
    } catch {
      // skip dirs without a scorecard
    }
  }
  return summaries.sort((a, b) => b.createdAt - a.createdAt);
}

/** In-memory active-run registry (keyed by runId) — used by the SSE bridge */
type ActiveRun = {
  ticks: Tick[];
  entries: TraceEntry[];
  state: "running" | "complete" | "error";
  error?: string;
  scenarioId: string;
  recipeName: string;
};

const active = new Map<string, ActiveRun>();
type Listener = (snapshot: ActiveRun) => void;
const listeners = new Map<string, Set<Listener>>();

export function registerActiveRun(id: string, run: ActiveRun) {
  active.set(id, run);
}
export function getActiveRun(id: string): ActiveRun | undefined { return active.get(id); }
export function emitActiveRunUpdate(id: string) {
  const run = active.get(id);
  if (!run) return;
  for (const fn of listeners.get(id) ?? []) fn(run);
}
export function subscribeActiveRun(id: string, fn: Listener) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  return () => listeners.get(id)!.delete(fn);
}
