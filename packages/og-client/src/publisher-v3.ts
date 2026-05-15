import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { ethers } from "ethers";
import { uploadBytes } from "./storage";
import { RunRegistryV3Client } from "./run-registry-v3";
import { loadChainConfig, type Network } from "./chain-config";

export interface PublishRunV3Input {
  /** Directory containing trace.jsonl + scorecard.json */
  runDir: string;
  /** AgentINFT tokenId the run is attributed to */
  tokenId: bigint;
  /** Network */
  network: Network;
  /** Private key for the publisher (must be a trustedAttester on RunRegistryV3) */
  privateKey: string;
  /** Self-described agent metadata; "" allowed but discouraged */
  model: string;
  framework: string;
  agentVersion: string;
}

export interface PublishRunV3Result {
  runId: bigint;
  txHash: string;
  traceRoot: string;
}

/** Upload trace+scorecard to 0G Storage and call RunRegistryV3.publish under tokenId. */
export async function publishRunV3(opts: PublishRunV3Input): Promise<PublishRunV3Result> {
  const cfg = await loadChainConfig(opts.network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(opts.privateKey, provider);

  const traceBytes = await readFile(path.join(opts.runDir, "trace.jsonl"));
  const scoreBytes = await readFile(path.join(opts.runDir, "scorecard.json"));
  const score = JSON.parse(scoreBytes.toString()) as {
    scenario: string;
    scorecard: { sortino: number; totalReturnPct: number; maxDrawdownPct: number };
  };

  const { rootHash: traceRoot } = await uploadBytes(traceBytes, opts.network, opts.privateKey);
  const scorecardHash = "0x" + createHash("sha256").update(scoreBytes).digest("hex");
  const scenarioId = ethers.id(score.scenario);
  const e6 = (n: number) => BigInt(Math.round(n * 1_000_000));

  const client = new RunRegistryV3Client(cfg, signer);
  const { runId, txHash } = await client.publish({
    tokenId: opts.tokenId,
    scenarioId,
    traceRoot,
    scorecardHash,
    scoreSortinoE6: e6(score.scorecard.sortino),
    totalReturnE6: e6(score.scorecard.totalReturnPct),
    maxDrawdownE6: e6(score.scorecard.maxDrawdownPct),
    model: opts.model || "unknown",
    framework: opts.framework || "unknown",
    agentVersion: opts.agentVersion || "",
  });

  return { runId, txHash, traceRoot };
}
