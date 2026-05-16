/**
 * Single source of truth for network metadata across the frontend.
 *
 * Switch networks by setting NEXT_PUBLIC_OG_NETWORK=mainnet (default: galileo).
 * Mainnet only "activates" once contracts/deployed-addresses.json has populated
 * mainnet + mainnetV2 sections — until then `isMainnetReady()` returns false
 * and `currentNetwork()` falls back to galileo with a one-time console warning.
 *
 * URLs (RPC, explorer, storage gateway) are derived from this module.
 * Never hardcode `chainscan-galileo.0g.ai` etc. inline — import from here.
 */

import deployedAddresses from "../../../contracts/deployed-addresses.json";

export type Network = "galileo" | "mainnet";

export interface NetworkMeta {
  id: Network;
  /** Human-readable label for chips and badges. */
  label: string;
  /** EVM chain id. */
  chainId: number;
  /** Public RPC endpoint. */
  rpcUrl: string;
  /** Block explorer base (no trailing slash). */
  explorerBase: string;
  /** 0G Storage indexer/gateway base for `?root=…` downloads (no trailing slash). */
  storageGateway: string;
  /** Whether this is a testnet (drives `testnet: true` in the viem chain). */
  testnet: boolean;
  /** Native currency descriptor for viem. */
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

/** Raw selection from env, may be ahead of contract deployment. */
function envNetwork(): Network {
  const v = process.env["NEXT_PUBLIC_OG_NETWORK"];
  return v === "mainnet" ? "mainnet" : "galileo";
}

/**
 * Returns true iff the mainnet `mainnetV2` slot in deployed-addresses.json
 * has the V3 contract address populated. The single field we gate on is
 * `RunRegistryV3` — without it, the leaderboard reads would fail.
 */
export function isMainnetReady(): boolean {
  const all = deployedAddresses as Record<string, Record<string, string> | undefined>;
  return Boolean(all["mainnetV2"]?.["RunRegistryV3"]);
}

/**
 * Active network the app actually uses. If env says mainnet but addresses
 * aren't populated yet, falls back to galileo. Logged once on the server side.
 */
let _warned = false;
export function currentNetwork(): Network {
  const want = envNetwork();
  if (want === "mainnet" && !isMainnetReady()) {
    if (!_warned && typeof window === "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[network] NEXT_PUBLIC_OG_NETWORK=mainnet but mainnetV2 addresses are empty. " +
        "Falling back to galileo. Populate contracts/deployed-addresses.json and redeploy.",
      );
      _warned = true;
    }
    return "galileo";
  }
  return want;
}

/** Full metadata for the current network (for `import { CURRENT_NETWORK }`). */
export const CURRENT_NETWORK: NetworkMeta = META[currentNetwork()];

/** Metadata for any network — useful when rendering both side-by-side. */
export function networkMeta(n: Network): NetworkMeta {
  return META[n];
}

// ─── URL helpers — always go through these, never hardcode ─────────────────

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
