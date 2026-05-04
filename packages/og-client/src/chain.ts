import { JsonRpcProvider, Wallet, Contract } from "ethers";

export interface ChainConfig {
  readonly rpcUrl: string;
  readonly privateKey?: string;
  readonly scenarioRegistry?: string;
  readonly agentRegistry?: string;
  readonly runRegistry?: string;
}

export function makeProvider(cfg: ChainConfig) {
  return new JsonRpcProvider(cfg.rpcUrl);
}

export function makeWallet(cfg: ChainConfig) {
  if (!cfg.privateKey) throw new Error("missing private key");
  return new Wallet(cfg.privateKey, makeProvider(cfg));
}

export function contract(address: string, abi: unknown[], signerOrProvider: Wallet | JsonRpcProvider) {
  return new Contract(address, abi as any, signerOrProvider as any);
}
