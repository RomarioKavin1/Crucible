// apps/web/lib/chains.ts
// Pure chain definitions — safe to import from BOTH server and client code.
// Do NOT add wagmi/RainbowKit imports here (those have browser-only deps).
import { defineChain } from "viem";

export const galileo = defineChain({
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: { default: { name: "Chainscan", url: "https://chainscan-galileo.0g.ai" } },
  testnet: true,
});
