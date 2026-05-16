"use client";
/**
 * useWallet — wraps wagmi + RainbowKit connection state into the shape our UI
 * actually uses. Components consume this hook instead of importing wagmi /
 * rainbowkit directly so we can swap providers later without touching markup.
 */
import { useCallback, useMemo } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type WalletState = {
  address: `0x${string}` | undefined;
  /** Hydration-safe short form for display: 0x89…f111. */
  formattedAddress: string;
  isConnected: boolean;
  /** True before the user has accepted the connect modal flow. */
  isConnecting: boolean;
  /** Opens RainbowKit's connect modal. No-op if no `openConnectModal`. */
  connect: () => void;
  disconnect: () => void;
};

export function useWallet(): WalletState {
  const { address, isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  const formattedAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  const connect = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  return {
    address,
    formattedAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect: () => disconnect(),
  };
}

/** One-off helper exposed for components that already have an address but
 *  want the same shortening logic. */
export function shortAddress(addr: string): string {
  if (!addr || !addr.startsWith("0x") || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
