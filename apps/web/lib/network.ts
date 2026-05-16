/**
 * Single source of truth for network metadata across the frontend.
 *
 * Order of precedence for active network:
 *   1. `crucible-network` cookie (set by the in-header NetworkToggle; works on
 *      both client and server). Writable at runtime.
 *   2. NEXT_PUBLIC_OG_NETWORK env (build-time default; mostly "galileo").
 *
 * `CURRENT_NETWORK` is a Proxy that re-resolves on every property access, so
 * existing call sites like `CURRENT_NETWORK.label` automatically pick up the
 * cookie change after a router.refresh() / reload — no refactor needed.
 *
 * URLs (RPC, explorer, storage gateway) all flow through here. Never hardcode
 * `chainscan-galileo.0g.ai` etc. inline — import from this module.
 */

import deployedAddresses from "../../../contracts/deployed-addresses.json";

export type Network = "galileo" | "mainnet";

export interface NetworkMeta {
  id: Network;
  label: string;
  chainId: number;
  rpcUrl: string;
  explorerBase: string;
  storageGateway: string;
  testnet: boolean;
  currency: { name: string; symbol: string; decimals: number };
}

const META: Record<Network, NetworkMeta> = {
  galileo: {
    id: "galileo",
    label: "0G Galileo",
    chainId: 16602,
    rpcUrl: "https://evmrpc-testnet.0g.ai",
    explorerBase: "https://chainscan-galileo.0g.ai",
    storageGateway: "https://indexer-storage-testnet-turbo.0g.ai",
    testnet: true,
    currency: { name: "0G", symbol: "0G", decimals: 18 },
  },
  mainnet: {
    id: "mainnet",
    label: "0G Mainnet",
    chainId: 16661,
    rpcUrl: "https://evmrpc.0g.ai",
    explorerBase: "https://chainscan.0g.ai",
    storageGateway: "https://indexer-storage.0g.ai",
    testnet: false,
    currency: { name: "0G", symbol: "0G", decimals: 18 },
  },
};

export const NETWORK_COOKIE = "crucible-network";

/** Parse the cookie value into a typed Network, or null if absent/invalid. */
function parseNetworkCookie(raw: string | null | undefined): Network | null {
  if (!raw) return null;
  const v = decodeURIComponent(raw);
  return v === "mainnet" || v === "galileo" ? v : null;
}

/** Client-side cookie read. Returns null on server. */
function readClientCookie(): Network | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)crucible-network=([^;]+)/);
  return parseNetworkCookie(m?.[1] ?? null);
}

function envNetwork(): Network {
  const v = process.env["NEXT_PUBLIC_OG_NETWORK"];
  return v === "mainnet" ? "mainnet" : "galileo";
}

export function isMainnetReady(): boolean {
  const all = deployedAddresses as Record<string, Record<string, string> | undefined>;
  return Boolean(all["mainnetV2"]?.["RunRegistryV3"]);
}

/**
 * Active network. Client reads cookie; server falls back to env.
 * (Server Components needing per-request cookie awareness should pass a cookie
 * value via `currentNetworkFromCookie(cookieValue)` — see lib/network-server.ts.)
 */
export function currentNetwork(): Network {
  const fromCookie = readClientCookie();
  if (fromCookie) {
    // Even if the cookie says mainnet but addresses aren't populated, respect
    // the user's choice and let the data layer surface the empty-state.
    return fromCookie;
  }
  const want = envNetwork();
  if (want === "mainnet" && !isMainnetReady()) return "galileo";
  return want;
}

/** Server-only helper: resolve network from an explicitly-passed cookie value. */
export function currentNetworkFromCookie(cookieValue: string | null | undefined): Network {
  const fromCookie = parseNetworkCookie(cookieValue);
  if (fromCookie) return fromCookie;
  const want = envNetwork();
  if (want === "mainnet" && !isMainnetReady()) return "galileo";
  return want;
}

/**
 * Proxy: every property access re-runs `currentNetwork()`, so callers like
 * `CURRENT_NETWORK.label` automatically respond to cookie changes. The Proxy
 * target is an empty object — all reads delegate to META[currentNetwork()].
 */
export const CURRENT_NETWORK: NetworkMeta = new Proxy({} as NetworkMeta, {
  get(_target, prop) {
    return META[currentNetwork()][prop as keyof NetworkMeta];
  },
  has(_target, prop) {
    return prop in META.galileo;
  },
  ownKeys() {
    return Reflect.ownKeys(META.galileo);
  },
  getOwnPropertyDescriptor(_t, prop) {
    return Reflect.getOwnPropertyDescriptor(META.galileo, prop);
  },
});

/** Direct lookup — useful when rendering both networks side-by-side. */
export function networkMeta(n: Network): NetworkMeta {
  return META[n];
}

// ─── URL helpers — all flow through CURRENT_NETWORK so they auto-switch ─────

export function explorerUrl(path = ""): string {
  return `${CURRENT_NETWORK.explorerBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function explorerAddress(addr: string): string {
  return `${CURRENT_NETWORK.explorerBase}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${CURRENT_NETWORK.explorerBase}/tx/${hash}`;
}

export function storageDownload(rootHash: string): string {
  return `${CURRENT_NETWORK.storageGateway}/file?root=${rootHash}`;
}

// ─── Network-explicit helpers (use when you already resolved the network) ──
// These bypass the cookie/env Proxy entirely. Useful when SSR has decided
// the target network and we need the URL to match on the client too.

export function storageDownloadFor(rootHash: string, network: Network): string {
  return `${META[network].storageGateway}/file?root=${rootHash}`;
}

export function explorerAddressFor(addr: string, network: Network): string {
  return `${META[network].explorerBase}/address/${addr}`;
}

export function explorerTxFor(hash: string, network: Network): string {
  return `${META[network].explorerBase}/tx/${hash}`;
}
