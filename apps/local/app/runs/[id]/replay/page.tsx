import { readFile } from "node:fs/promises";
import path from "node:path";
import { ScenarioReplay, AgentReasoningStream } from "@crucible/ui-kit";
import { loadScenario } from "@crucible/core";
import type { TraceEntry, Fill } from "@crucible/core";
import { DEFAULT_RUNS_DIR, DEFAULT_SCENARIOS_DIR } from "@/lib/server/run-store";

export default async function ReplayPage({ params }: { params: { id: string } }) {
  const runDir = path.resolve(DEFAULT_RUNS_DIR, params.id);
  const trace = await readFile(path.join(runDir, "trace.jsonl"), "utf8");
  const entries = trace.split("\n").filter(Boolean).map((l) => JSON.parse(l) as TraceEntry);
  const scorecardRaw = await readFile(path.join(runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw) as { scenario: string };
  const scenario = await loadScenario(path.resolve(DEFAULT_SCENARIOS_DIR, scorecard.scenario));
  const fills: Fill[] = entries.flatMap((e) => e.fills);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Replay <code>{params.id}</code></h2>
      <ScenarioReplay ticks={scenario.ticks} fills={fills} height={500} />
      <AgentReasoningStream entries={entries} maxHeight={600} />
    </div>
  );
}
