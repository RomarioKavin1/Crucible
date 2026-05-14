import { ethers } from "ethers";
import { AGENT_INFT_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

type InftContract = ethers.Contract & {
  mint: (desc: string, dataHash: string) => Promise<ethers.TransactionResponse>;
  ownerOf: (tokenId: bigint) => Promise<string>;
  balanceOf: (owner: string) => Promise<bigint>;
  intelligentData: (tokenId: bigint) => Promise<[string, string]>;
  isAuthorized: (tokenId: bigint, signer: string) => Promise<boolean>;
  getDelegations: (tokenId: bigint) => Promise<string[]>;
  tokensOf: (owner: string) => Promise<bigint[]>;
  delegateAccess: (tokenId: bigint, assistant: string) => Promise<ethers.TransactionResponse>;
  revokeAccess: (tokenId: bigint, assistant: string) => Promise<ethers.TransactionResponse>;
};

export class AgentINFTClient {
  private contract: InftContract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.AgentINFT,
      AGENT_INFT_ABI,
      signerOrProvider,
    ) as InftContract;
  }

  /** @internal escape hatch for tests; do not use in production code */
  static __forTest(contract: any): AgentINFTClient {
    const c = Object.create(AgentINFTClient.prototype) as AgentINFTClient;
    (c as any).contract = contract;
    return c;
  }

  async mint(dataDescription: string, dataHash: string): Promise<{ tokenId: bigint; txHash: string }> {
    const tx = await this.contract.mint(dataDescription, dataHash);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Mint tx had no receipt");
    const ev = receipt.logs
      .map((l) => {
        try { return this.contract.interface.parseLog(l as ethers.Log); } catch { return null; }
      })
      .find((e) => e?.name === "AgentMinted");
    if (!ev) throw new Error("AgentMinted event not found in receipt");
    return { tokenId: ev.args[0] as bigint, txHash: tx.hash };
  }

  ownerOf(tokenId: bigint): Promise<string> { return this.contract.ownerOf(tokenId); }
  balanceOf(owner: string): Promise<bigint> { return this.contract.balanceOf(owner); }

  async intelligentData(tokenId: bigint): Promise<{ description: string; dataHash: string }> {
    const [description, dataHash] = await this.contract.intelligentData(tokenId);
    return { description, dataHash };
  }

  isAuthorized(tokenId: bigint, signer: string): Promise<boolean> {
    return this.contract.isAuthorized(tokenId, signer);
  }

  async getDelegations(tokenId: bigint): Promise<string[]> {
    const r = await this.contract.getDelegations(tokenId);
    return (typeof (r as any).toArray === "function" ? (r as any).toArray() : r) as string[];
  }

  async tokensOf(owner: string): Promise<bigint[]> {
    const r = await this.contract.tokensOf(owner);
    return (typeof (r as any).toArray === "function" ? (r as any).toArray() : r) as bigint[];
  }

  async delegateAccess(tokenId: bigint, assistant: string): Promise<string> {
    const tx = await this.contract.delegateAccess(tokenId, assistant);
    await tx.wait();
    return tx.hash;
  }

  async revokeAccess(tokenId: bigint, assistant: string): Promise<string> {
    const tx = await this.contract.revokeAccess(tokenId, assistant);
    await tx.wait();
    return tx.hash;
  }
}
