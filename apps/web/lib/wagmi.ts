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
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "c4f79cc821944d9680842e34466bfbd",
  // IMPORTANT: register the REAL chain objects, not activeChain (which is a
  // network-aware Proxy that resolves to galileo at SSR/module-load time and
  // would collapse the tuple to a single chain id, making switchChain to the
  // other network a silent no-op).
  chains: [galileo, mainnet],
  ssr: true,
});
