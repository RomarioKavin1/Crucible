#!/usr/bin/env tsx
/**
 * Mint an Agent ID NFT on the AgentRegistry contract.
 *
 * Usage:
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   pnpm dlx tsx scripts/mint-agent.ts <network> <metadata-uri>
 *
 * Example:
 *   pnpm dlx tsx scripts/mint-agent.ts galileo "ipfs://baseline-claude-meta"
 *
 * Output: prints the new agentId (use this with --publish-agent-id on `crucible run`).
 */
import { ethers } from "ethers";
import { AgentRegistryClient, loadChainConfig, type Network } from "@crucible/og-client";

async function main() {
  const network = (process.argv[2] ?? "galileo") as Network;
  const metadataURI = process.argv[3] ?? "ipfs://crucible-agent";
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("Missing DEPLOYER_PRIVATE_KEY env var");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(pk, provider);
  console.log(`Minting Agent ID on ${network} as ${signer.address}...`);
  const client = new AgentRegistryClient(cfg, signer);
  const { agentId, txHash } = await client.mint(metadataURI);
  console.log(`Agent ID minted: ${agentId.toString()}`);
  console.log(`Tx hash: ${txHash}`);
  console.log(`\nUse with: --publish-agent-id ${agentId.toString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
