#!/usr/bin/env tsx
/**
 * Publish a scenario bundle to 0G Storage and register it on ScenarioRegistry.
 *
 * Usage:
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   pnpm dlx tsx scripts/publish-scenario.ts <network> <scenario-dir> <scenario-id> [visibility]
 *
 * Example:
 *   pnpm dlx tsx scripts/publish-scenario.ts galileo \
 *     scenarios/synthetic-eth-flash-crash eth-tariff public
 *
 * Notes:
 * - <scenario-id> must be ≤31 chars (bytes32 limit). Doesn't have to match the
 *   manifest.id field — this is the on-chain key.
 * - The full scenario bundle is tarballed in-memory, uploaded to 0G Storage,
 *   then registered on-chain with the SHA-256 content hash and the storage rootHash.
 */
import { createReadStream } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { create as createTar } from "tar";
import { ethers } from "ethers";
import {
  ScenarioRegistryClient,
  loadChainConfig,
  uploadBytes,
  type Network,
} from "@crucible/og-client";

async function tarballToBuffer(dir: string): Promise<Uint8Array> {
  // Use streaming tar then collect into a Buffer.
  const chunks: Buffer[] = [];
  const parent = path.dirname(dir);
  const base = path.basename(dir);
  const stream = createTar({ gzip: true, cwd: parent }, [base]);
  for await (const c of stream as AsyncIterable<Buffer>) chunks.push(c);
  return new Uint8Array(Buffer.concat(chunks));
}

async function sha256OfDir(dir: string): Promise<string> {
  const files = (await readdir(dir)).sort();
  const h = createHash("sha256");
  for (const f of files) {
    h.update(f);
    h.update(await readFile(path.join(dir, f)));
  }
  return "0x" + h.digest("hex");
}

async function main() {
  const network = (process.argv[2] ?? "galileo") as Network;
  const scenarioDir = path.resolve(process.argv[3] ?? "scenarios/synthetic-eth-flash-crash");
  const scenarioId = process.argv[4] ?? "eth-tariff";
  const visibility = process.argv[5] ?? "public";

  if (scenarioId.length > 31) {
    throw new Error(`scenario-id must be ≤31 chars (got ${scenarioId.length})`);
  }
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("Missing DEPLOYER_PRIVATE_KEY env var");

  console.log(`Publishing ${scenarioDir} as "${scenarioId}" on ${network}...`);

  // 1. Compute deterministic content hash
  const contentHash = await sha256OfDir(scenarioDir);
  console.log(`  contentHash:     ${contentHash}`);

  // 2. Tarball + upload to 0G Storage
  console.log(`  tarballing...`);
  const data = await tarballToBuffer(scenarioDir);
  console.log(`  uploading ${(data.length / 1024).toFixed(1)} KiB to 0G Storage...`);
  const { rootHash, txHash: storageTx } = await uploadBytes(data, network, pk);
  console.log(`  storageRootHash: ${rootHash}`);
  console.log(`  storage tx:      ${storageTx}`);

  // 3. Register on-chain
  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(pk, provider);
  const client = new ScenarioRegistryClient(cfg, signer);
  console.log(`  registering on ScenarioRegistry...`);
  const receipt = await client.publish(scenarioId, contentHash, rootHash, visibility);
  console.log(`  registry tx:     ${receipt!.hash}`);
  console.log(`\nPublished. Verify on Galileo Explorer:`);
  console.log(`  https://chainscan-galileo.0g.ai/tx/${receipt!.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
