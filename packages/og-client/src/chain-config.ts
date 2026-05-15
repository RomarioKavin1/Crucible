import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Network = "galileo" | "mainnet";

export interface ChainConfig {
  network: Network;
  rpcUrl: string;
  contracts: {
    // v1 (legacy, still queryable)
    ScenarioRegistry: string;
    AgentRegistry: string;
    RunRegistry: string;
    // v2 (kept for legacy reads)
    AgentINFT: string;
    RunRegistryV2: string;
    // v3 (active — adds model/framework/agentVersion)
    RunRegistryV3: string;
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDRESSES_PATH = path.resolve(__dirname, "../../../contracts/deployed-addresses.json");

interface AddressesFile {
  galileo?: Partial<ChainConfig["contracts"]>;
  galileoV2?: Partial<ChainConfig["contracts"]>;
  mainnet?: Partial<ChainConfig["contracts"]>;
  mainnetV2?: Partial<ChainConfig["contracts"]>;
}

export async function loadChainConfig(network: Network): Promise<ChainConfig> {
  const raw = await readFile(ADDRESSES_PATH, "utf8");
  const all = JSON.parse(raw) as AddressesFile;
  const v1 = all[network] ?? {};
  const v2 = all[`${network}V2` as keyof AddressesFile] ?? {};

  const merged = {
    ScenarioRegistry: v2.ScenarioRegistry ?? v1.ScenarioRegistry ?? "",
    AgentRegistry:    v1.AgentRegistry ?? "",
    RunRegistry:      v1.RunRegistry ?? "",
    AgentINFT:        v2.AgentINFT ?? "",
    RunRegistryV2:    v2.RunRegistryV2 ?? "",
    RunRegistryV3:    v2.RunRegistryV3 ?? "",
  };

  // Require at least the v3 active contracts on Galileo. mainnet may have
  // empty addresses for now.
  if (network === "galileo" && (!merged.AgentINFT || !merged.RunRegistryV3)) {
    throw new Error(`Missing v3 addresses for network=${network} (need galileoV2.AgentINFT + galileoV2.RunRegistryV3)`);
  }

  const rpcUrl =
    network === "galileo"
      ? process.env["OG_GALILEO_RPC"] ?? "https://evmrpc-testnet.0g.ai"
      : process.env["OG_MAINNET_RPC"] ?? "https://evmrpc.0g.ai";

  return { network, rpcUrl, contracts: merged };
}
