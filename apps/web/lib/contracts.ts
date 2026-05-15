// apps/web/lib/contracts.ts
import { createPublicClient, http } from "viem";
import { galileo } from "./chains";
import deployedAddresses from "../../../contracts/deployed-addresses.json";

const v2 = (deployedAddresses as Record<string, Record<string, string>>)["galileoV2"] ?? {};
export const AGENT_INFT_ADDRESS: `0x${string}` = v2["AgentINFT"] as `0x${string}`;
export const RUN_REGISTRY_V2_ADDRESS: `0x${string}` = v2["RunRegistryV2"] as `0x${string}`;

const AGENT_INFT_ABI = [
  { type: "function", name: "tokensOf", stateMutability: "view", inputs: [{ name: "o", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "intelligentData", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "string" }, { type: "bytes32" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getDelegations", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address[]" }] },
  { type: "function", name: "isAuthorized", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "s", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "d", type: "string" }, { name: "h", type: "bytes32" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "delegateAccess", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "a", type: "address" }], outputs: [] },
  { type: "function", name: "revokeAccess", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "a", type: "address" }], outputs: [] },
] as const;

const RUN_REGISTRY_V2_ABI = [
  { type: "function", name: "getRunsByToken", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "getRunsByScenario", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "totalRuns", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "agentINFT", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "getRun",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "scenarioId", type: "bytes32" },
          { name: "traceRoot", type: "bytes32" },
          { name: "scorecardHash", type: "bytes32" },
          { name: "scoreSortinoE6", type: "int256" },
          { name: "totalReturnE6", type: "int256" },
          { name: "maxDrawdownE6", type: "int256" },
          { name: "timestamp", type: "uint64" },
          { name: "recordedBy", type: "address" },
        ],
      },
    ],
  },
] as const;

export const publicClient = createPublicClient({ chain: galileo, transport: http() });

export async function readTokensOf(owner: `0x${string}`): Promise<bigint[]> {
  return (await publicClient.readContract({
    address: AGENT_INFT_ADDRESS,
    abi: AGENT_INFT_ABI,
    functionName: "tokensOf",
    args: [owner],
  })) as bigint[];
}

export async function readIntelligentData(tokenId: bigint) {
  const r = (await publicClient.readContract({
    address: AGENT_INFT_ADDRESS,
    abi: AGENT_INFT_ABI,
    functionName: "intelligentData",
    args: [tokenId],
  })) as readonly [string, `0x${string}`];
  return { description: r[0], dataHash: r[1] };
}

export async function readDelegations(tokenId: bigint): Promise<readonly `0x${string}`[]> {
  return (await publicClient.readContract({
    address: AGENT_INFT_ADDRESS,
    abi: AGENT_INFT_ABI,
    functionName: "getDelegations",
    args: [tokenId],
  })) as `0x${string}`[];
}

export async function readOwnerOf(tokenId: bigint): Promise<`0x${string}`> {
  return (await publicClient.readContract({
    address: AGENT_INFT_ADDRESS,
    abi: AGENT_INFT_ABI,
    functionName: "ownerOf",
    args: [tokenId],
  })) as `0x${string}`;
}

export async function readRunsByToken(tokenId: bigint): Promise<bigint[]> {
  return (await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS,
    abi: RUN_REGISTRY_V2_ABI,
    functionName: "getRunsByToken",
    args: [tokenId],
  })) as bigint[];
}

export async function readRun(runId: bigint) {
  return await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS,
    abi: RUN_REGISTRY_V2_ABI,
    functionName: "getRun",
    args: [runId],
  });
}

export const ABIs = { AGENT_INFT_ABI, RUN_REGISTRY_V2_ABI };
