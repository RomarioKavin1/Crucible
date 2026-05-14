import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Network = "galileo" | "mainnet";

export interface ChainConfig {
  network: Network;
  rpcUrl: string;
  contracts: {
    ScenarioRegistry: string;
    AgentRegistry: string;
    RunRegistry: string;
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDRESSES_PATH = path.resolve(__dirname, "../../../contracts/deployed-addresses.json");

export async function loadChainConfig(network: Network): Promise<ChainConfig> {
  const raw = await readFile(ADDRESSES_PATH, "utf8");
  const all = JSON.parse(raw) as Record<Network, ChainConfig["contracts"]>;
  if (!all[network] || !all[network].RunRegistry) {
    throw new Error(`No deployed addresses for network=${network}`);
  }
  const rpcUrl =
    network === "galileo"
      ? process.env["OG_GALILEO_RPC"] ?? "https://evmrpc-testnet.0g.ai"
      : process.env["OG_MAINNET_RPC"] ?? "https://evmrpc.0g.ai";
  return { network, rpcUrl, contracts: all[network] };
}
