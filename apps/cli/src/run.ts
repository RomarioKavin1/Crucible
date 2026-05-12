import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { JsonlFileRecorder, ScenarioEngine, loadScenario } from "@crucible/core";
import { SkillRuntime } from "@crucible/skills";
import { loadRecipe } from "./recipe.js";
import { makeAnthropicAgent } from "./agent.js";

export interface RunOpts {
  scenario: string;
  agent: string;
  outDir: string;
}

export async function runCommand(opts: RunOpts): Promise<void> {
  const scenario = await loadScenario(opts.scenario);
  const recipe = await loadRecipe(opts.agent);
  const runDir = path.join(
    opts.outDir,
    `${recipe.name}_${scenario.manifest.id}_${Date.now()}`
  );
  await mkdir(runDir, { recursive: true });

  const tracePath = path.join(runDir, "trace.jsonl");
  const recorder = new JsonlFileRecorder(tracePath);

  // Wire engine -> SkillRuntime -> agent
  const engine = new ScenarioEngine(scenario, recorder);
  const runtime = new SkillRuntime(engine.getEngineHandle());
  const agentStep = makeAnthropicAgent(recipe);
  const stepFn = (snapshot: Parameters<typeof agentStep>[0]) =>
    agentStep(snapshot, runtime);

  const result = await engine.run(stepFn);
  await writeFile(
    path.join(runDir, "scorecard.json"),
    JSON.stringify(
      { scenario: scenario.manifest.id, recipe: recipe.name, ...result },
      null,
      2
    )
  );
  console.log(`Run complete. Output: ${runDir}`);
  console.log(`  Sortino:           ${result.scorecard.sortino.toFixed(4)}`);
  console.log(`  Max drawdown:      ${(result.scorecard.maxDrawdownPct * 100).toFixed(2)}%`);
  console.log(`  Total return:      ${(result.scorecard.totalReturnPct * 100).toFixed(2)}%`);
  console.log(`  Win rate:          ${(result.scorecard.winRate * 100).toFixed(1)}%`);
}
