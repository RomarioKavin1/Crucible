import { ethers } from "ethers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadBytes } from "./storage.js";
import { loadChainConfig } from "./chain-config.js";
import { AgentRegistryClient } from "./agent-registry.js";
import { RunRegistryClient } from "./run-registry.js";

export interface PublishRunOpts {
  runDir: string;
  agentId: bigint;
  recipeHash: string;
  network: "galileo" | "mainnet";
  privateKey: string;
}

export async function publishRun(opts: PublishRunOpts) {
  const cfg = await loadChainConfig(opts.network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(opts.privateKey, provider);

  // 1. Read trace + scorecard
  const trace = await readFile(path.join(opts.runDir, "trace.jsonl"));
  const scorecardRaw = await readFile(path.join(opts.runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw) as {
    scenario: string;
    scorecard: { sortino: number; totalReturnPct: number; maxDrawdownPct: number };
  };

  // 2. Upload trace to 0G Storage
  console.log("Uploading trace to 0G Storage...");
  const { rootHash: traceHash, txHash: storageTx } = await uploadBytes(trace, opts.network);
  console.log(`  trace rootHash: ${traceHash} (tx ${storageTx})`);

  // 3. Lock recipe on-chain (only if it's not already the current recipe)
  const agentClient = new AgentRegistryClient(cfg, signer);
  const onchainRecipe = await agentClient.getCurrentRecipe(opts.agentId);
  if (onchainRecipe.toLowerCase() !== opts.recipeHash.toLowerCase()) {
    console.log(`Updating on-chain recipe for agent ${opts.agentId} → ${opts.recipeHash}`);
    await agentClient.updateRecipe(opts.agentId, opts.recipeHash);
  }

  // 4. Record run
  const runClient = new RunRegistryClient(cfg, signer);
  console.log("Recording run on-chain...");
  const { runId, txHash } = await runClient.recordRun({
    agentId: opts.agentId,
    scenarioId: scorecard.scenario,
    recipeHash: opts.recipeHash,
    traceHash,
    scoreSortino: scorecard.scorecard.sortino,
    totalReturn: scorecard.scorecard.totalReturnPct,
    maxDrawdown: scorecard.scorecard.maxDrawdownPct,
  });
  console.log(`  runId=${runId} (tx ${txHash})`);
  return { runId, txHash, traceHash };
}
