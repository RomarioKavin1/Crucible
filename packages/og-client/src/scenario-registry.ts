import { ethers } from "ethers";
import { SCENARIO_REGISTRY_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

export class ScenarioRegistryClient {
  private contract: ethers.Contract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(cfg.contracts.ScenarioRegistry, SCENARIO_REGISTRY_ABI, signerOrProvider);
  }

  async publish(id: string, contentHash: string, storageRootHash: string, visibility: string) {
    const idBytes32 = ethers.encodeBytes32String(id);
    const c = this.contract as ethers.Contract & {
      publishScenario: (...a: unknown[]) => Promise<ethers.TransactionResponse>;
      getScenario: (...a: unknown[]) => Promise<unknown>;
      listScenarioIds: () => Promise<string[]>;
    };
    const tx = await c.publishScenario(idBytes32, contentHash, storageRootHash, visibility);
    return tx.wait();
  }

  async get(id: string) {
    const idBytes32 = ethers.encodeBytes32String(id);
    const c = this.contract as ethers.Contract & {
      getScenario: (...a: unknown[]) => Promise<unknown>;
    };
    return c.getScenario(idBytes32);
  }

  async listIds(): Promise<string[]> {
    const c = this.contract as ethers.Contract & {
      listScenarioIds: () => Promise<string[]>;
    };
    const ids = await c.listScenarioIds();
    return ids.map((b) => ethers.decodeBytes32String(b));
  }
}
