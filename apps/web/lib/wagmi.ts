// apps/web/lib/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const galileo = defineChain({
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: { default: { name: "Chainscan", url: "https://chainscan-galileo.0g.ai" } },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "Crucible Bench",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "REPLACE_ME",
  chains: [galileo],
  ssr: true,
});
