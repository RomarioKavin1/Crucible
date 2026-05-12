import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { JsonlFileRecorder, ScenarioEngine, loadScenario } from "@crucible/core";
import { SkillRuntime } from "@crucible/skills";
import { publishRun } from "@crucible/og-client";
import { loadRecipe } from "./recipe.js";
import { makeAnthropicAgent } from "./agent.js";

export interface RunOpts {
  scenario: string;
  agent: string;
  outDir: string;
  publish?: { agentId: bigint; network: "galileo" | "mainnet"; privateKey: string };
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

  let result;
  try {
    result = await engine.run(stepFn);
  } catch (err) {
    await recorder.close().catch(() => {});
    throw err;
  }
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
  console.log(`  Max drawdown:      ${(Math.abs(result.scorecard.maxDrawdownPct) * 100).toFixed(2)}%`);
  console.log(`  Total return:      ${(result.scorecard.totalReturnPct * 100).toFixed(2)}%`);
  console.log(`  Win rate:          ${(result.scorecard.winRate * 100).toFixed(1)}%`);

  if (opts.publish) {
    const recipeBytes = await readFile(opts.agent);
    const recipeHash = "0x" + createHash("sha256").update(recipeBytes).digest("hex");
    console.log(`Publishing to 0G ${opts.publish.network}...`);
    const { runId, txHash } = await publishRun({
      runDir,
      agentId: opts.publish.agentId,
      recipeHash,
      network: opts.publish.network,
      privateKey: opts.publish.privateKey,
    });
    console.log(`  Run ID on-chain: ${runId}`);
    console.log(`  Tx hash:         ${txHash}`);
  }
}
