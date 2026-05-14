import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { ethers } from "ethers";
import { uploadBytes } from "./storage";
import { RunRegistryV2Client } from "./run-registry-v2";
import { loadChainConfig, type Network } from "./chain-config";

export interface PublishRunV2Input {
  /** Directory containing trace.jsonl + scorecard.json */
  runDir: string;
  /** AgentINFT tokenId the run is attributed to */
  tokenId: bigint;
  /** Network */
  network: Network;
  /** Private key for the publisher (must be a trustedAttester on RunRegistryV2) */
  privateKey: string;
}

export interface PublishRunV2Result {
  runId: bigint;
  txHash: string;
  traceRoot: string;
}

/** Upload trace+scorecard to 0G Storage and call RunRegistryV2.publish under tokenId. */
export async function publishRunV2(opts: PublishRunV2Input): Promise<PublishRunV2Result> {
  const cfg = await loadChainConfig(opts.network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(opts.privateKey, provider);

  const traceBytes = await readFile(path.join(opts.runDir, "trace.jsonl"));
  const scoreBytes = await readFile(path.join(opts.runDir, "scorecard.json"));
  const score = JSON.parse(scoreBytes.toString()) as {
    scenario: string;
    scorecard: { sortino: number; totalReturnPct: number; maxDrawdownPct: number };
  };

  // 1. Upload trace to 0G Storage
  const { rootHash: traceRoot } = await uploadBytes(traceBytes, opts.network, opts.privateKey);

  // 2. SHA-256 of scorecard JSON
  const scorecardHash = "0x" + createHash("sha256").update(scoreBytes).digest("hex");

  // 3. Hash scenarioId string -> bytes32 (keccak256, matching how the web app + scenarios derive it)
  const scenarioId = ethers.id(score.scenario);

  // 4. Convert floats to e6 fixed-point bigints
  const e6 = (n: number) => BigInt(Math.round(n * 1_000_000));

  // 5. Publish on chain
  const client = new RunRegistryV2Client(cfg, signer);
  const { runId, txHash } = await client.publish({
    tokenId: opts.tokenId,
    scenarioId,
    traceRoot,
    scorecardHash,
    scoreSortinoE6: e6(score.scorecard.sortino),
    totalReturnE6: e6(score.scorecard.totalReturnPct),
    maxDrawdownE6: e6(score.scorecard.maxDrawdownPct),
  });

  return { runId, txHash, traceRoot };
}
