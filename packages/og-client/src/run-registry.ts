import { ethers } from "ethers";
import { RUN_REGISTRY_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

export interface RecordRunArgs {
  agentId: bigint;
  scenarioId: string;
  recipeHash: string;
  traceHash: string;
  scoreSortino: number;    // raw float; will be scaled by 1e6
  totalReturn: number;
  maxDrawdown: number;
  teeAttestation?: string; // hex bytes
}

type RunContract = ethers.Contract & {
  recordRun: (...args: unknown[]) => Promise<ethers.TransactionResponse>;
  getRun: (runId: bigint) => Promise<unknown>;
  getRunsByScenario: (scenarioId: string) => Promise<bigint[]>;
  totalRuns: () => Promise<bigint>;
};

export class RunRegistryClient {
  private contract: RunContract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.RunRegistry,
      RUN_REGISTRY_ABI,
      signerOrProvider
    ) as RunContract;
  }

  async recordRun(args: RecordRunArgs): Promise<{ runId: bigint; txHash: string }> {
    const e6 = (x: number) => BigInt(Math.trunc(x * 1_000_000));
    const tx = await this.contract.recordRun(
      args.agentId,
      ethers.encodeBytes32String(args.scenarioId),
      args.recipeHash,
      args.traceHash,
      e6(args.scoreSortino),
      e6(args.totalReturn),
      e6(args.maxDrawdown),
      args.teeAttestation ?? "0x"
    );
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l: ethers.Log) => {
        try { return this.contract.interface.parseLog(l); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "RunRecorded");
    if (!ev) throw new Error("RunRecorded event not found in receipt");
    return { runId: ev.args[0] as bigint, txHash: tx.hash };
  }

  async getRun(runId: bigint) {
    return this.contract.getRun(runId);
  }

  async getRunsByScenario(scenarioId: string): Promise<bigint[]> {
    return this.contract.getRunsByScenario(ethers.encodeBytes32String(scenarioId));
  }

  async totalRuns(): Promise<bigint> {
    return this.contract.totalRuns();
  }
}
