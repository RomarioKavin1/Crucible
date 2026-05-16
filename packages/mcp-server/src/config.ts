// packages/mcp-server/src/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { loadChainConfig, type Network, AgentINFTClient, RunRegistryV2Client } from "@crucible/og-client";
import { buildDomain, type EIP712Domain } from "./auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCENARIOS_DIR = path.resolve(__dirname, "..", "..", "..", "scenarios");

/** Per-network on-chain wiring. */
export interface NetworkConfig {
  network: Network;
  domain: EIP712Domain;
  inft: AgentINFTClient;
  runRegistry: RunRegistryV2Client;
  provider: ethers.JsonRpcProvider;
  publisher: ethers.Wallet;
  publisherPrivateKey: string;
}

/** Server-wide config + per-network configs by name. */
export interface ServerConfig {
  port: number;
  scenariosDir: string;
  publicUrl: string;
  webPublicUrl: string;
  /** Network used when the client doesn't specify one. Set via DEFAULT_NETWORK env. */
  defaultNetwork: Network;
  /** Active per-network configs. A network is "active" iff its publisher key is set. */
  networks: Map<Network, NetworkConfig>;
}

const CHAIN_IDS: Record<Network, number> = { galileo: 16602, mainnet: 16661 };

async function buildNetworkConfig(network: Network, pk: string): Promise<NetworkConfig> {
  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const publisher = new ethers.Wallet(pk, provider);
  const inft = new AgentINFTClient(cfg, provider);
  const runRegistry = new RunRegistryV2Client(cfg, publisher);
  // verifyingContract = the RunRegistryV2 slot. On mainnet that slot points
  // at the V3 address (we never deployed a separate V2 there) — see
  // contracts/deployed-addresses.json.
  const domain = buildDomain(CHAIN_IDS[network], cfg.contracts.RunRegistryV2);
  return { network, domain, inft, runRegistry, provider, publisher, publisherPrivateKey: pk };
}

export async function loadConfig(): Promise<ServerConfig> {
  const port = parseInt(process.env["PORT"] ?? "8080", 10);
  const scenariosDir = process.env["SCENARIOS_DIR"]
    ? path.resolve(process.env["SCENARIOS_DIR"])
    : DEFAULT_SCENARIOS_DIR;
  const publicUrl = process.env["PUBLIC_URL"] ?? "http://localhost:8080";
  const webPublicUrl = process.env["WEB_PUBLIC_URL"] ?? "http://localhost:3001";
  const defaultNetwork = (process.env["DEFAULT_NETWORK"] ?? process.env["NETWORK"] ?? "galileo") as Network;

  // Resolve per-network publisher keys.
  // Backwards-compatible: PUBLISHER_PRIVATE_KEY without a network suffix
  // applies to the network named in NETWORK (legacy single-network mode).
  const galileoKey = process.env["GALILEO_PUBLISHER_PRIVATE_KEY"]
    ?? (defaultNetwork === "galileo" ? process.env["PUBLISHER_PRIVATE_KEY"] : undefined);
  const mainnetKey = process.env["MAINNET_PUBLISHER_PRIVATE_KEY"]
    ?? (defaultNetwork === "mainnet" ? process.env["PUBLISHER_PRIVATE_KEY"] : undefined);

  const networks = new Map<Network, NetworkConfig>();
  if (galileoKey) networks.set("galileo", await buildNetworkConfig("galileo", galileoKey));
  if (mainnetKey) networks.set("mainnet", await buildNetworkConfig("mainnet", mainnetKey));

  if (networks.size === 0) {
    throw new Error(
      "No publisher keys configured. Set GALILEO_PUBLISHER_PRIVATE_KEY and/or " +
      "MAINNET_PUBLISHER_PRIVATE_KEY (or legacy PUBLISHER_PRIVATE_KEY).",
    );
  }
  if (!networks.has(defaultNetwork)) {
    throw new Error(
      `DEFAULT_NETWORK="${defaultNetwork}" but no publisher key for it. ` +
      `Active networks: ${[...networks.keys()].join(", ")}.`,
    );
  }

  return { port, scenariosDir, publicUrl, webPublicUrl, defaultNetwork, networks };
}

/** Look up a network's wiring, or throw a clean error the tool handlers can surface. */
export function networkOf(cfg: ServerConfig, network?: string): NetworkConfig {
  const n = (network as Network | undefined) ?? cfg.defaultNetwork;
  const c = cfg.networks.get(n);
  if (!c) {
    throw new Error(
      `Network "${n}" is not active on this server. Active: ${[...cfg.networks.keys()].join(", ")}.`,
    );
  }
  return c;
}
