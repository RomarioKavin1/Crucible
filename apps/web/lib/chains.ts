// apps/web/lib/chains.ts
// Pure viem chain definitions — safe to import from BOTH server and client code.
// Do NOT add wagmi/RainbowKit imports here (those have browser-only deps).
//
// Active chain (galileo or mainnet) is decided by NEXT_PUBLIC_OG_NETWORK via
// lib/network.ts. wagmi/Providers reads `activeChain` from this module.

import { defineChain } from "viem";
import { CURRENT_NETWORK, networkMeta } from "./network";

export const galileo = defineChain({
  id: networkMeta("galileo").chainId,
  name: networkMeta("galileo").label,
  nativeCurrency: networkMeta("galileo").currency,
  rpcUrls: { default: { http: [networkMeta("galileo").rpcUrl] } },
  blockExplorers: { default: { name: "Chainscan", url: networkMeta("galileo").explorerBase } },
  testnet: true,
});

export const mainnet = defineChain({
  id: networkMeta("mainnet").chainId,
  name: networkMeta("mainnet").label,
  nativeCurrency: networkMeta("mainnet").currency,
  rpcUrls: { default: { http: [networkMeta("mainnet").rpcUrl] } },
  blockExplorers: { default: { name: "Chainscan", url: networkMeta("mainnet").explorerBase } },
  testnet: false,
});

/**
 * Resolves to whichever chain is active RIGHT NOW (cookie + env). Wrapped in
 * a Proxy so every property access re-checks — call sites continue to use
 * `activeChain` as if it were a const, and it auto-updates after a cookie flip
 * + router refresh.
 */
function resolveChain() {
  return CURRENT_NETWORK.id === "mainnet" ? mainnet : galileo;
}

export const activeChain = new Proxy({} as ReturnType<typeof resolveChain>, {
  get(_t, prop) {
    return (resolveChain() as any)[prop];
  },
  has(_t, prop) {
    return prop in galileo;
  },
  ownKeys() {
    return Reflect.ownKeys(galileo);
  },
  getOwnPropertyDescriptor(_t, prop) {
    return Reflect.getOwnPropertyDescriptor(galileo, prop);
  },
}) as ReturnType<typeof resolveChain>;
