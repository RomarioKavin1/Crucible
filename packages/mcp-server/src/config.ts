// packages/mcp-server/src/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { loadChainConfig, type Network, AgentINFTClient, RunRegistryV2Client } from "@crucible/og-client";
import { buildDomain, type EIP712Domain } from "./auth";

// Default scenariosDir resolves to repo-root/scenarios regardless of CWD.
// packages/mcp-server/src/ → ../../scenarios = repo-root/scenarios
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCENARIOS_DIR = path.resolve(__dirname, "..", "..", "..", "scenarios");

export interface ServerConfig {
  port: number;
  network: Network;
  scenariosDir: string;
  publicUrl: string;
  webPublicUrl: string;
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
  const scenariosDir = process.env["SCENARIOS_DIR"]
    ? path.resolve(process.env["SCENARIOS_DIR"])
    : DEFAULT_SCENARIOS_DIR;
  const publicUrl = process.env["PUBLIC_URL"] ?? "http://localhost:8080";
  const webPublicUrl = process.env["WEB_PUBLIC_URL"] ?? "http://localhost:3001";
  const pk = process.env["PUBLISHER_PRIVATE_KEY"];
  if (!pk) throw new Error("Missing PUBLISHER_PRIVATE_KEY env");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const publisher = new ethers.Wallet(pk, provider);
  const inft = new AgentINFTClient(cfg, provider);
  const runRegistry = new RunRegistryV2Client(cfg, publisher);
  const chainId = network === "galileo" ? 16602 : 16661;
  const domain = buildDomain(chainId, cfg.contracts.RunRegistryV2);

  return { port, network, scenariosDir, publicUrl, webPublicUrl, publisherPrivateKey: pk, domain, inft, runRegistry, provider, publisher };
}
