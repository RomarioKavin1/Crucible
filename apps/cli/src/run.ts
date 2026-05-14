import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { JsonlFileRecorder, ScenarioEngine, loadScenario } from "@crucible/core";
import { SkillRuntime } from "@crucible/skills";
import { publishRun } from "@crucible/og-client";
import { loadRecipe } from "./recipe";
import { makeAnthropicAgent } from "./agent";

export interface RunOpts {
  scenario: string;
  agent: string;
  outDir: string;
  publish?: { agentId: bigint; network: "galileo" | "mainnet"; privateKey: string };
}

/**
 * Resolve a path argument against the user's original working directory, not
 * the (potentially `cd`-ed) cwd of the spawned Node process. pnpm sets INIT_CWD
 * to the dir where the pnpm command was invoked, which is what users expect for
 * relative-path args.
 */
function resolveUserPath(p: string): string {
  if (path.isAbsolute(p)) return p;
  const base = process.env["INIT_CWD"] ?? process.cwd();
  return path.resolve(base, p);
}

export async function runCommand(opts: RunOpts): Promise<void> {
  const scenarioPath = resolveUserPath(opts.scenario);
  const agentPath = resolveUserPath(opts.agent);
  const outDirAbs = resolveUserPath(opts.outDir);
  const scenario = await loadScenario(scenarioPath);
  const recipe = await loadRecipe(agentPath);
  const runDir = path.join(
    outDirAbs,
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
    const recipeBytes = await readFile(agentPath);
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
