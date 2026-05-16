// apps/web/lib/contracts.ts
import { createPublicClient, http, type PublicClient } from "viem";
import { activeChain } from "./chains";
import { CURRENT_NETWORK } from "./network";
import deployedAddresses from "../../../contracts/deployed-addresses.json";

// ─── Per-network contract address resolution ──────────────────────────────────
//
// Addresses live in deployed-addresses.json under galileoV2 / mainnetV2.
// We resolve LAZILY (on every read) so the network toggle in the header
// instantly switches every contract call site without re-importing modules.

function v2Slot() {
  const key = CURRENT_NETWORK.id === "mainnet" ? "mainnetV2" : "galileoV2";
  return (deployedAddresses as Record<string, Record<string, string>>)[key] ?? {};
}

/**
 * Boxed-String proxy: behaves like a `0x${string}` for all the things viem
 * does (regex test for `isAddress`, string interpolation, lowercase compare).
 * Each property/coercion access re-runs `getter()` so the address always
 * matches the currently-active network.
 */
function addrProxy(getter: () => string): `0x${string}` {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy(new String("") as any, {
    get(_t, prop) {
      const v = String(getter() ?? "");
      if (prop === Symbol.toPrimitive) return () => v;
      if (prop === "toString" || prop === "valueOf") return () => v;
      // @ts-expect-error — delegating to the underlying string
      return v[prop];
    },
  });
}

export const AGENT_INFT_ADDRESS:        `0x${string}` = addrProxy(() => v2Slot()["AgentINFT"] ?? "");
export const RUN_REGISTRY_V2_ADDRESS:   `0x${string}` = addrProxy(() => v2Slot()["RunRegistryV2"] ?? "");
export const RUN_REGISTRY_V3_ADDRESS:   `0x${string}` = addrProxy(() => v2Slot()["RunRegistryV3"] ?? "");

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

// Lazy per-network client cache. Recreated when network changes (via cookie).
const _clients = new Map<number, PublicClient>();
function getClient(): PublicClient {
  const chainId = activeChain.id;
  let c = _clients.get(chainId);
  if (!c) {
    c = createPublicClient({ chain: activeChain, transport: http() });
    _clients.set(chainId, c);
  }
  return c;
}

/** Proxy so existing `publicClient.readContract(...)` calls auto-route to the
 *  right chain after the network toggle. */
export const publicClient: PublicClient = new Proxy({} as PublicClient, {
  get(_t, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = getClient() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

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
  // New runs are recorded on V3. V3 exposes getRunsByToken with an identical
  // signature, so callers stay unchanged. (V2 is frozen — its data is still
  // queryable elsewhere for the deprecated leaderboard view.)
  return (await publicClient.readContract({
    address: RUN_REGISTRY_V3_ADDRESS,
    abi: RUN_REGISTRY_V3_ABI,
    functionName: "getRunsByToken",
    args: [tokenId],
  })) as bigint[];
}

export async function readRun(runId: bigint) {
  // New runs publish to V3. V3 returns a superset of V2 fields
  // (adds model/framework/agentVersion), so callers that read the
  // common fields (traceRoot, tokenId, scenarioId, sortino, …) work unchanged.
  return await publicClient.readContract({
    address: RUN_REGISTRY_V3_ADDRESS,
    abi: RUN_REGISTRY_V3_ABI,
    functionName: "getRun",
    args: [runId],
  });
}

const RUN_REGISTRY_V3_ABI = [
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
          { name: "model", type: "string" },
          { name: "framework", type: "string" },
          { name: "agentVersion", type: "string" },
        ],
      },
    ],
  },
] as const;

export const ABIs = { AGENT_INFT_ABI, RUN_REGISTRY_V2_ABI, RUN_REGISTRY_V3_ABI };
