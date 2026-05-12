import { ethers } from "ethers";
import { AGENT_REGISTRY_ABI } from "./abis.js";
import type { ChainConfig } from "./chain-config.js";

type AgentContract = ethers.Contract & {
  mintAgent: (metadataURI: string) => Promise<ethers.TransactionResponse>;
  updateRecipe: (agentId: bigint, recipeHash: string) => Promise<ethers.TransactionResponse>;
  getCurrentRecipe: (agentId: bigint) => Promise<string>;
};

export class AgentRegistryClient {
  private contract: AgentContract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.AgentRegistry,
      AGENT_REGISTRY_ABI,
      signerOrProvider
    ) as AgentContract;
  }

  async mint(metadataURI: string): Promise<{ agentId: bigint; txHash: string }> {
    const tx = await this.contract.mintAgent(metadataURI);
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l: ethers.Log) => {
        try { return this.contract.interface.parseLog(l); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "AgentMinted");
    if (!ev) throw new Error("AgentMinted event not found in receipt");
    return { agentId: ev.args[0] as bigint, txHash: tx.hash };
  }

  async updateRecipe(agentId: bigint, recipeHash: string) {
    const tx = await this.contract.updateRecipe(agentId, recipeHash);
    return tx.wait();
  }

  async getCurrentRecipe(agentId: bigint): Promise<string> {
    return this.contract.getCurrentRecipe(agentId);
  }
}
