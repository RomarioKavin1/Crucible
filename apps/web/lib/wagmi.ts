// apps/web/lib/wagmi.ts
// Client-only — DO NOT import this from server components.
// (RainbowKit's getDefaultConfig pulls in WalletConnect SDK that crashes under SSR.)
// For a server-safe chain definition, import from `./chains` instead.
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { galileo, mainnet, activeChain } from "./chains";

export { galileo, mainnet, activeChain };

export const wagmiConfig: Config = getDefaultConfig({
  appName: "Crucible Bench",
  // Public Reown demo project ID — works without setup but should be replaced with
  // your own NEXT_PUBLIC_WALLETCONNECT_ID for production to avoid rate limits.
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "c4f79cc821944d9680842e34466bfbd",
  // Wagmi accepts a non-empty tuple — even when only one chain is active, list
  // both so the wallet's chain switcher shows the alternative.
  chains: [activeChain, activeChain.id === galileo.id ? mainnet : galileo],
  ssr: true,
});
