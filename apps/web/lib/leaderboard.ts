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

// ─── v2/v3 fetchers (RunRegistryV3 active + RunRegistryV2 legacy) ──────────
import { keccak256, toBytes, createPublicClient, http, type PublicClient } from "viem";
import { publicClient, RUN_REGISTRY_V2_ADDRESS, RUN_REGISTRY_V3_ADDRESS, ABIs, readIntelligentData } from "./contracts";
import { networkMeta, type Network } from "./network";
import { galileo, mainnet } from "./chains";
import deployedAddresses from "../../../contracts/deployed-addresses.json";

export interface V2LeaderboardRow {
  runId: string;
  tokenId: string;
  agentDescription: string;
  scenarioId: string;
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  recordedBy: string;
  // V3 self-described agent metadata; "" / "unknown" when reading legacy v2 rows
  model: string;
  framework: string;
  agentVersion: string;
}

export async function fetchAllRunsV2(): Promise<V2LeaderboardRow[]> {
  const total = await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI, functionName: "totalRuns",
  }) as bigint;

  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));
  const descCache = new Map<string, string>();

  return Promise.all(ids.map(async (id) => {
    const r = await publicClient.readContract({
      address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI,
      functionName: "getRun", args: [id],
    }) as any;
    const tokenIdStr = (r.tokenId as bigint).toString();
    let desc = descCache.get(tokenIdStr);
    if (desc === undefined) {
      try { desc = (await readIntelligentData(r.tokenId as bigint)).description; }
      catch { desc = ""; }
      descCache.set(tokenIdStr, desc!);
    }
    return {
      runId: id.toString(),
      tokenId: tokenIdStr,
      agentDescription: desc!,
      scenarioId: r.scenarioId as string,
      sortino: Number(r.scoreSortinoE6 as bigint) / 1e6,
      totalReturn: Number(r.totalReturnE6 as bigint) / 1e6,
      maxDrawdown: Number(r.maxDrawdownE6 as bigint) / 1e6,
      timestamp: Number(r.timestamp as bigint),
      recordedBy: r.recordedBy as string,
      model: "",
      framework: "",
      agentVersion: "",
    };
  }));
}

// Explicit per-network reader: lets API routes target a specific network
// (via cookie) without relying on the global Proxy-resolved publicClient.
const _clientCache = new Map<Network, PublicClient>();
function clientForNetwork(n: Network): PublicClient {
  let c = _clientCache.get(n);
  if (!c) {
    const chain = n === "mainnet" ? mainnet : galileo;
    c = createPublicClient({ chain, transport: http() });
    _clientCache.set(n, c);
  }
  return c;
}
function addressesForNetwork(n: Network) {
  const key = n === "mainnet" ? "mainnetV2" : "galileoV2";
  const slot = (deployedAddresses as Record<string, Record<string, string>>)[key] ?? {};
  return slot;
}

/**
 * Network-aware version of fetchAllRunsV3 for server-side callers that resolved
 * the target network themselves (e.g. an API route reading the cookie via
 * next/headers). Uses an explicit publicClient + address pair instead of the
 * cookie-Proxy fallback.
 */
export async function fetchAllRunsV3ForNetwork(n: Network): Promise<V2LeaderboardRow[]> {
  const client = clientForNetwork(n);
  const addr = addressesForNetwork(n)["RunRegistryV3"];
  if (!addr) return [];

  const total = (await client.readContract({
    address: addr as `0x${string}`, abi: ABIs.RUN_REGISTRY_V3_ABI, functionName: "totalRuns",
  })) as bigint;

  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));
  const inftAddr = addressesForNetwork(n)["AgentINFT"] as `0x${string}` | undefined;
  const descCache = new Map<string, string>();

  return Promise.all(ids.map(async (id) => {
    const r = (await client.readContract({
      address: addr as `0x${string}`, abi: ABIs.RUN_REGISTRY_V3_ABI,
      functionName: "getRun", args: [id],
    })) as any;
    const tokenIdStr = (r.tokenId as bigint).toString();
    let desc = descCache.get(tokenIdStr);
    if (desc === undefined && inftAddr) {
      try {
        const data = (await client.readContract({
          address: inftAddr, abi: ABIs.AGENT_INFT_ABI,
          functionName: "intelligentData", args: [r.tokenId as bigint],
        })) as readonly [string, `0x${string}`];
        desc = data[0];
      } catch { desc = ""; }
      descCache.set(tokenIdStr, desc!);
    }
    return {
      runId: id.toString(), tokenId: tokenIdStr, agentDescription: desc ?? "",
      scenarioId: r.scenarioId as string,
      sortino: Number(r.scoreSortinoE6 as bigint) / 1e6,
      totalReturn: Number(r.totalReturnE6 as bigint) / 1e6,
      maxDrawdown: Number(r.maxDrawdownE6 as bigint) / 1e6,
      timestamp: Number(r.timestamp as bigint),
      recordedBy: r.recordedBy as string,
      model: r.model as string,
      framework: r.framework as string,
      agentVersion: r.agentVersion as string,
    };
  }));
}

/** V3 (active): includes self-described model/framework/agentVersion. */
export async function fetchAllRunsV3(): Promise<V2LeaderboardRow[]> {
  const total = await publicClient.readContract({
    address: RUN_REGISTRY_V3_ADDRESS, abi: ABIs.RUN_REGISTRY_V3_ABI, functionName: "totalRuns",
  }) as bigint;

  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));
  const descCache = new Map<string, string>();

  return Promise.all(ids.map(async (id) => {
    const r = await publicClient.readContract({
      address: RUN_REGISTRY_V3_ADDRESS, abi: ABIs.RUN_REGISTRY_V3_ABI,
      functionName: "getRun", args: [id],
    }) as any;
    const tokenIdStr = (r.tokenId as bigint).toString();
    let desc = descCache.get(tokenIdStr);
    if (desc === undefined) {
      try { desc = (await readIntelligentData(r.tokenId as bigint)).description; }
      catch { desc = ""; }
      descCache.set(tokenIdStr, desc!);
    }
    return {
      runId: id.toString(),
      tokenId: tokenIdStr,
      agentDescription: desc!,
      scenarioId: r.scenarioId as string,
      sortino: Number(r.scoreSortinoE6 as bigint) / 1e6,
      totalReturn: Number(r.totalReturnE6 as bigint) / 1e6,
      maxDrawdown: Number(r.maxDrawdownE6 as bigint) / 1e6,
      timestamp: Number(r.timestamp as bigint),
      recordedBy: r.recordedBy as string,
      model: r.model as string,
      framework: r.framework as string,
      agentVersion: r.agentVersion as string,
    };
  }));
}

export async function fetchRunsByScenarioV2(scenarioId: string): Promise<V2LeaderboardRow[]> {
  const scenarioHash = keccak256(toBytes(scenarioId));
  const ids = await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI,
    functionName: "getRunsByScenario", args: [scenarioHash],
  }) as bigint[];
  const descCache = new Map<string, string>();
  return Promise.all(ids.map(async (id) => {
    const r = await publicClient.readContract({
      address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI,
      functionName: "getRun", args: [id],
    }) as any;
    const tokenIdStr = (r.tokenId as bigint).toString();
    let desc = descCache.get(tokenIdStr);
    if (desc === undefined) {
      try { desc = (await readIntelligentData(r.tokenId as bigint)).description; }
      catch { desc = ""; }
      descCache.set(tokenIdStr, desc!);
    }
    return {
      runId: id.toString(),
      tokenId: tokenIdStr,
      agentDescription: desc!,
      scenarioId,
      sortino: Number(r.scoreSortinoE6 as bigint) / 1e6,
      totalReturn: Number(r.totalReturnE6 as bigint) / 1e6,
      maxDrawdown: Number(r.maxDrawdownE6 as bigint) / 1e6,
      timestamp: Number(r.timestamp as bigint),
      recordedBy: r.recordedBy as string,
      model: "", framework: "", agentVersion: "",
    };
  })).then((rows) => rows.sort((a, b) => b.sortino - a.sortino));
}
