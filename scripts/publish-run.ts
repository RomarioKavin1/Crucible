#!/usr/bin/env tsx
/**
 * Publish an existing run directory (trace + scorecard) to 0G.
 * Use this when a `crucible run --publish-network ...` failed at the publish
 * stage but the local trace + scorecard were written successfully.
 *
 * Usage:
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   pnpm exec tsx scripts/publish-run.ts <network> <run-dir> <recipe-path> <agent-id>
 *
 * Example:
 *   pnpm exec tsx scripts/publish-run.ts galileo \
 *     runs/haiku-cheap_synthetic-eth-flash-crash_1778653941358 \
 *     apps/cli/test/fixtures/haiku-cheap-recipe.yaml \
 *     1
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { publishRun, type Network } from "@crucible/og-client";

async function main() {
  const network = (process.argv[2] ?? "galileo") as Network;
  const runDir = path.resolve(process.argv[3] ?? "");
  const recipePath = path.resolve(process.argv[4] ?? "");
  const agentIdStr = process.argv[5];
  if (!runDir || !recipePath || !agentIdStr) {
    throw new Error("Usage: publish-run.ts <network> <run-dir> <recipe-path> <agent-id>");
  }
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("Missing DEPLOYER_PRIVATE_KEY env var");

  const recipeBytes = await readFile(recipePath);
  const recipeHash = "0x" + createHash("sha256").update(recipeBytes).digest("hex");
  console.log(`Publishing run from ${runDir}`);
  console.log(`  recipeHash: ${recipeHash}`);

  const { runId, txHash, traceHash } = await publishRun({
    runDir,
    agentId: BigInt(agentIdStr),
    recipeHash,
    network,
    privateKey: pk,
  });
  console.log(`\n✅ Published`);
  console.log(`  Run ID on-chain: ${runId.toString()}`);
  console.log(`  Tx hash:         ${txHash}`);
  console.log(`  Trace hash (0G): ${traceHash}`);
  console.log(`\nVerify on Galileo Explorer:`);
  console.log(`  https://chainscan-galileo.0g.ai/tx/${txHash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
