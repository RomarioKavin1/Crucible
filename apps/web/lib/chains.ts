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

/** The currently-active viem chain — derived from NEXT_PUBLIC_OG_NETWORK + isMainnetReady gate. */
export const activeChain = CURRENT_NETWORK.id === "mainnet" ? mainnet : galileo;
