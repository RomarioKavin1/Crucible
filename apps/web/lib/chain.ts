import { ethers } from "ethers";
import {
  RunRegistryClient,
  AgentRegistryClient,
  ScenarioRegistryClient,
  type ChainConfig,
} from "@crucible/og-client";
import deployedAddresses from "../../../contracts/deployed-addresses.json";
import { CURRENT_NETWORK } from "./network";

const NETWORK = CURRENT_NETWORK.id;
const RPC_URL = CURRENT_NETWORK.rpcUrl;

// Build ChainConfig from the statically-imported addresses (webpack inlines
// the JSON at build time — no fs.readFile at runtime, which would fail on
// Vercel because monorepo files outside apps/web/ aren't shipped).
//
// Both `<network>` (v1) and `<network>V2` (v2/v3) keys are read.
function buildCfg(): ChainConfig {
  const all = deployedAddresses as Record<string, Record<string, string> | undefined>;
  const v1 = all[NETWORK] ?? {};
  const v2 = all[`${NETWORK}V2` as keyof typeof all] ?? {};
  return {
    network: NETWORK,
    rpcUrl: RPC_URL,
    contracts: {
      ScenarioRegistry: v2["ScenarioRegistry"] ?? v1["ScenarioRegistry"] ?? "",
      AgentRegistry: v1["AgentRegistry"] ?? "",
      RunRegistry: v1["RunRegistry"] ?? "",
      AgentINFT: v2["AgentINFT"] ?? "",
      RunRegistryV2: v2["RunRegistryV2"] ?? "",
      RunRegistryV3: v2["RunRegistryV3"] ?? "",
    },
  };
}

export const CHAIN_CONFIG = buildCfg();

let _provider: ethers.JsonRpcProvider | null = null;
function provider() {
  if (_provider) return _provider;
  _provider = new ethers.JsonRpcProvider(RPC_URL);
  return _provider;
}

export async function getRunRegistry() {
  return new RunRegistryClient(CHAIN_CONFIG, provider());
}

export async function getAgentRegistry() {
  return new AgentRegistryClient(CHAIN_CONFIG, provider());
}

export async function getScenarioRegistry() {
  return new ScenarioRegistryClient(CHAIN_CONFIG, provider());
}

export const ACTIVE_NETWORK = NETWORK;
