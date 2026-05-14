import { getRunRegistry, getScenarioRegistry } from "./chain";
import { fromE6 } from "./format";
import { ethers } from "ethers";

export interface LeaderboardRow {
  runId: string;
  agentId: string;
  scenarioId: string;
  recipeHash: string;
  traceHash: string;
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  ownerAddr: string;
}

interface RunTuple {
  agentId: bigint;
  scenarioId: string;
  recipeHash: string;
  traceHash: string;
  scoreSortinoE6: bigint;
  totalReturnE6: bigint;
  maxDrawdownE6: bigint;
  timestamp: bigint;
  teeAttestation: string;
  recordedBy: string;
}

export async function fetchAllRuns(): Promise<LeaderboardRow[]> {
  const runReg = await getRunRegistry();
  const total = await runReg.totalRuns();
  const rows: LeaderboardRow[] = [];
  for (let i = 0n; i < total; i++) {
    const run = (await runReg.getRun(i)) as RunTuple;
    rows.push({
      runId: i.toString(),
      agentId: run.agentId.toString(),
      scenarioId: ethers.decodeBytes32String(run.scenarioId),
      recipeHash: run.recipeHash,
      traceHash: run.traceHash,
      sortino: fromE6(run.scoreSortinoE6),
      totalReturn: fromE6(run.totalReturnE6),
      maxDrawdown: fromE6(run.maxDrawdownE6),
      timestamp: Number(run.timestamp),
      ownerAddr: run.recordedBy,
    });
  }
  return rows;
}

export interface AgentAggregateRow {
  agentId: string;
  runCount: number;
  avgSortino: number;
  bestSortino: number;
  totalReturnSum: number;
}

export function aggregateByAgent(runs: LeaderboardRow[]): AgentAggregateRow[] {
  const byAgent = new Map<string, LeaderboardRow[]>();
  for (const r of runs) {
    if (!byAgent.has(r.agentId)) byAgent.set(r.agentId, []);
    byAgent.get(r.agentId)!.push(r);
  }
  const out: AgentAggregateRow[] = [];
  for (const [agentId, runs] of byAgent) {
    const sortinos = runs.map((r) => r.sortino);
    out.push({
      agentId,
      runCount: runs.length,
      avgSortino: sortinos.reduce((a, b) => a + b, 0) / sortinos.length,
      bestSortino: Math.max(...sortinos),
      totalReturnSum: runs.reduce((acc, r) => acc + r.totalReturn, 0),
    });
  }
  return out.sort((a, b) => b.avgSortino - a.avgSortino);
}

export function filterByScenario(runs: LeaderboardRow[], scenarioId: string): LeaderboardRow[] {
  return runs.filter((r) => r.scenarioId === scenarioId).sort((a, b) => b.sortino - a.sortino);
}

/** Union of (registered scenarios in ScenarioRegistry) + (scenario IDs actually referenced by runs in RunRegistry). */
export async function listScenarios(runs?: LeaderboardRow[]): Promise<string[]> {
  const reg = await getScenarioRegistry();
  let registered: string[] = [];
  try {
    registered = await reg.listIds();
  } catch {
    /* contract may not be deployed yet */
  }
  const referenced = runs ? Array.from(new Set(runs.map((r) => r.scenarioId))) : [];
  return Array.from(new Set([...registered, ...referenced])).sort();
}
