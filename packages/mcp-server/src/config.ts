// packages/mcp-server/src/config.ts
import { ethers } from "ethers";
import { loadChainConfig, type Network, AgentINFTClient, RunRegistryV2Client } from "@crucible/og-client";
import { buildDomain, type EIP712Domain } from "./auth";

export interface ServerConfig {
  port: number;
  network: Network;
  scenariosDir: string;
  publicUrl: string;
  publisherPrivateKey: string;
  domain: EIP712Domain;
  inft: AgentINFTClient;
  runRegistry: RunRegistryV2Client;
  provider: ethers.JsonRpcProvider;
  publisher: ethers.Wallet;
}

export async function loadConfig(): Promise<ServerConfig> {
  const port = parseInt(process.env["PORT"] ?? "8080", 10);
  const network = (process.env["NETWORK"] ?? "galileo") as Network;
  const scenariosDir = process.env["SCENARIOS_DIR"] ?? "scenarios";
  const publicUrl = process.env["PUBLIC_URL"] ?? "http://localhost:8080";
  const pk = process.env["PUBLISHER_PRIVATE_KEY"];
  if (!pk) throw new Error("Missing PUBLISHER_PRIVATE_KEY env");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const publisher = new ethers.Wallet(pk, provider);
  const inft = new AgentINFTClient(cfg, provider);
  const runRegistry = new RunRegistryV2Client(cfg, publisher);
  const chainId = network === "galileo" ? 16602 : 16661;
  const domain = buildDomain(chainId, cfg.contracts.RunRegistryV2);

  return { port, network, scenariosDir, publicUrl, publisherPrivateKey: pk, domain, inft, runRegistry, provider, publisher };
}
