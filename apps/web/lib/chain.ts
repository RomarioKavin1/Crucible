import { ethers } from "ethers";
import {
  loadChainConfig,
  RunRegistryClient,
  AgentRegistryClient,
  ScenarioRegistryClient,
  type Network,
} from "@crucible/og-client";

const NETWORK: Network = (process.env["NEXT_PUBLIC_OG_NETWORK"] as Network) ?? "galileo";

let _provider: ethers.JsonRpcProvider | null = null;
async function provider() {
  if (_provider) return _provider;
  const cfg = await loadChainConfig(NETWORK);
  _provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  return _provider;
}

export async function getRunRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new RunRegistryClient(cfg, await provider());
}

export async function getAgentRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new AgentRegistryClient(cfg, await provider());
}

export async function getScenarioRegistry() {
  const cfg = await loadChainConfig(NETWORK);
  return new ScenarioRegistryClient(cfg, await provider());
}

export const ACTIVE_NETWORK = NETWORK;
