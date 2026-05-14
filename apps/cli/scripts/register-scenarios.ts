#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { ethers } from "ethers";
import { loadChainConfig, type Network, ScenarioRegistryClient } from "@crucible/og-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCENARIOS_DIR = path.join(REPO_ROOT, "scenarios");

interface MinimalManifest {
  id: string;
  content_hash: string;
}

async function main() {
  const network = (process.env["NETWORK"] ?? "galileo") as Network;
  const pk = process.env["DEPLOYER_PRIVATE_KEY"];
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY must be set");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ScenarioRegistryClient(cfg, wallet);

  const dirs = await readdir(SCENARIOS_DIR, { withFileTypes: true });
  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const manifestPath = path.join(SCENARIOS_DIR, id, "manifest.yaml");
    let m: MinimalManifest;
    try {
      const raw = await readFile(manifestPath, "utf8");
      m = yaml.load(raw) as MinimalManifest;
    } catch {
      continue;
    }

    // Check if already published
    try {
      const existing = (await registry.get(m.id)) as { contentHash: string } | null;
      if (existing && existing.contentHash !== ethers.ZeroHash) {
        console.log(
          `= ${m.id}: already registered (hash ${existing.contentHash.slice(0, 12)}…), skipping`,
        );
        continue;
      }
    } catch {
      // not registered yet — fall through
    }

    console.log(`▶ Registering ${m.id} → ${m.content_hash}`);
    // publishScenario(bytes32 id, bytes32 contentHash, bytes32 storageRootHash, string visibility)
    // storageRootHash is ZeroHash here; visibility is "public"
    const rcpt = await registry.publish(m.id, m.content_hash, ethers.ZeroHash, "public");
    console.log(`  ✓ tx ${(rcpt as { hash: string }).hash}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
