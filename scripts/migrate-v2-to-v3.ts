#!/usr/bin/env tsx
/**
 * One-shot migration: copy every existing RunRegistryV2 row into RunRegistryV3.
 *
 * Why: V3 added on-chain `model` / `framework` / `agentVersion` fields that V2
 * runs never captured. Without this script, V2 runs disappear from the new
 * /leaderboard (which reads V3) until someone re-runs each scenario.
 *
 * What it does:
 *   1. Reads totalRuns() from V2.
 *   2. For each id, reads getRun(id), copies the score + traceRoot + scorecardHash
 *      + tokenId + scenarioId.
 *   3. Calls V3.publish(...) with model="unknown", framework="v2-legacy",
 *      agentVersion="" so they're clearly tagged.
 *
 * Caveats:
 *   - Original timestamps are NOT preserved (V3.publish uses block.timestamp).
 *     The leaderboard "Published" column will read "now".
 *   - The publisher (signer here) must be a trustedAttester on V3.
 *     The DeployV3Testnet script auto-trusts the deployer, which is the same key.
 *
 * Usage:
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   pnpm dlx tsx scripts/migrate-v2-to-v3.ts
 */
import { ethers } from "ethers";

const RPC = process.env.OG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai";
const PK  = process.env.DEPLOYER_PRIVATE_KEY;
const V2  = "0x80C1496980BA1183f8368F6072a130D7B01eDA7D";
const V3  = "0xe7d44754c73C29Ef95b9b0a37aa41471c0c9731a";

const V2_ABI = [
  "function totalRuns() view returns (uint256)",
  "function getRun(uint256 runId) view returns (tuple(uint256 tokenId, bytes32 scenarioId, bytes32 traceRoot, bytes32 scorecardHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6, uint64 timestamp, address recordedBy))",
];
const V3_ABI = [
  "function publish(uint256 tokenId, bytes32 scenarioId, bytes32 traceRoot, bytes32 scorecardHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6, string model, string framework, string agentVersion) returns (uint256)",
  "function totalRuns() view returns (uint256)",
];

async function main() {
  if (!PK) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  const provider = new ethers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(PK, provider);

  const v2 = new ethers.Contract(V2, V2_ABI, provider);
  const v3 = new ethers.Contract(V3, V3_ABI, signer);

  const total = await v2["totalRuns"]() as bigint;
  const startV3 = await v3["totalRuns"]() as bigint;
  console.log(`▸ V2 has ${total} runs · V3 currently has ${startV3}`);

  if (startV3 > 0n) {
    console.warn("⚠ V3 is non-empty. Migration would duplicate runs. Aborting.");
    console.warn("  If you want to proceed anyway, comment out this guard.");
    process.exit(1);
  }

  for (let i = 1n; i <= total; i++) {
    const r = await v2["getRun"](i) as any;
    console.log(`\n▸ Migrating V2 run #${i}`);
    console.log(`    tokenId=${r.tokenId}  scenario=${r.scenarioId.slice(0, 10)}...`);
    console.log(`    sortino=${Number(r.scoreSortinoE6) / 1e6}  return=${Number(r.totalReturnE6) / 1e6}%`);

    const tx = await v3["publish"](
      r.tokenId,
      r.scenarioId,
      r.traceRoot,
      r.scorecardHash,
      r.scoreSortinoE6,
      r.totalReturnE6,
      r.maxDrawdownE6,
      "unknown",
      "v2-legacy",
      "",
      { type: 0, gasPrice: 3_000_000_000n },
    );
    const receipt = await tx.wait();
    console.log(`    ✓ V3 publish tx ${tx.hash} (block ${receipt?.blockNumber})`);
  }

  const endV3 = await v3["totalRuns"]() as bigint;
  console.log(`\n✓ Done. V3 now has ${endV3} runs.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
