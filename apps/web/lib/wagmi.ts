// apps/web/lib/wagmi.ts
// Client-only — DO NOT import this from server components.
// (RainbowKit's getDefaultConfig pulls in WalletConnect SDK that crashes under SSR.)
// For a server-safe chain definition, import from `./chains` instead.
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { galileo } from "./chains";

export { galileo };

export const wagmiConfig = getDefaultConfig({
  appName: "Crucible Bench",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "REPLACE_ME",
  chains: [galileo],
  ssr: true,
});
