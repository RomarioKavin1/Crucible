import { ethers } from "ethers";
import { RUN_REGISTRY_V3_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

export interface PublishV3Input {
  tokenId: bigint;
  scenarioId: string;     // bytes32
  traceRoot: string;      // bytes32
  scorecardHash: string;  // bytes32
  scoreSortinoE6: bigint;
  totalReturnE6: bigint;
  maxDrawdownE6: bigint;
  model: string;
  framework: string;
  agentVersion: string;
}

export interface RunRecordV3 {
  tokenId: bigint;
  scenarioId: string;
  traceRoot: string;
  scorecardHash: string;
  scoreSortinoE6: bigint;
  totalReturnE6: bigint;
  maxDrawdownE6: bigint;
  timestamp: bigint;
  recordedBy: string;
  model: string;
  framework: string;
  agentVersion: string;
}

type RegistryV3Contract = ethers.Contract & {
  publish: (
    tokenId: bigint, scenarioId: string, traceRoot: string, scorecardHash: string,
    scoreSortinoE6: bigint, totalReturnE6: bigint, maxDrawdownE6: bigint,
    model: string, framework: string, agentVersion: string,
  ) => Promise<ethers.TransactionResponse>;
  totalRuns: () => Promise<bigint>;
  getRun: (runId: bigint) => Promise<ethers.Result>;
  getRunsByToken: (tokenId: bigint) => Promise<ethers.Result>;
  getRunsByScenario: (scenarioId: string) => Promise<ethers.Result>;
  agentINFT: () => Promise<string>;
};

export class RunRegistryV3Client {
  private contract: RegistryV3Contract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.RunRegistryV3,
      RUN_REGISTRY_V3_ABI,
      signerOrProvider,
    ) as RegistryV3Contract;
  }

  static __forTest(contract: any): RunRegistryV3Client {
    const c = Object.create(RunRegistryV3Client.prototype);
    c.contract = contract;
    return c;
  }

  async publish(input: PublishV3Input): Promise<{ runId: bigint; txHash: string }> {
    const tx = await this.contract.publish(
      input.tokenId, input.scenarioId, input.traceRoot, input.scorecardHash,
      input.scoreSortinoE6, input.totalReturnE6, input.maxDrawdownE6,
      input.model, input.framework, input.agentVersion,
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error("publish tx had no receipt");
    const ev = receipt.logs
      .map((l: ethers.Log) => { try { return this.contract.interface.parseLog(l); } catch { return null; } })
      .find((e: ethers.LogDescription | null) => e?.name === "RunPublished");
    if (!ev) throw new Error("RunPublished event not found in receipt");
    return { runId: ev.args[0] as bigint, txHash: tx.hash };
  }

  async totalRuns(): Promise<bigint> {
    return this.contract.totalRuns();
  }

  async getRun(runId: bigint): Promise<RunRecordV3> {
    const r = await this.contract.getRun(runId);
    return {
      tokenId: r[0], scenarioId: r[1], traceRoot: r[2], scorecardHash: r[3],
      scoreSortinoE6: r[4], totalReturnE6: r[5], maxDrawdownE6: r[6],
      timestamp: r[7], recordedBy: r[8],
      model: r[9], framework: r[10], agentVersion: r[11],
    };
  }

  async getRunsByToken(tokenId: bigint): Promise<bigint[]> {
    const r = await this.contract.getRunsByToken(tokenId);
    return (typeof (r as any).toArray === "function" ? (r as any).toArray() : r) as bigint[];
  }

  async getRunsByScenario(scenarioId: string): Promise<bigint[]> {
    const r = await this.contract.getRunsByScenario(scenarioId);
    return (typeof (r as any).toArray === "function" ? (r as any).toArray() : r) as bigint[];
  }

  async agentINFT(): Promise<string> {
    return this.contract.agentINFT();
  }
}
