"use client";
/**
 * useNetwork — thin wrapper over wagmi's chain hooks that returns our typed
 * NetworkMeta shape and exposes the app's *expected* network alongside the
 * wallet's *current* network. Consumers shouldn't import wagmi directly.
 */
import { useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  CURRENT_NETWORK,
  networkMeta,
  type Network,
  type NetworkMeta,
} from "../network";

type NetworkState = {
  /** Network the app is configured to talk to. */
  expected: NetworkMeta;
  /** What the wallet is actually on (undefined if not connected). */
  current: NetworkMeta | undefined;
  /** True if connected and on the expected chain. */
  isCorrect: boolean;
  /** True if a chain id is connected. */
  isConnected: boolean;
  /** Switch the wallet to the expected network. No-op on success path; the
   *  wallet's UX handles user rejection. */
  switchToExpected: () => void;
  isSwitching: boolean;
};

const ID_TO_NETWORK: Record<number, Network> = { 16602: "galileo", 16661: "mainnet" };

export function useNetwork(): NetworkState {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  return useMemo<NetworkState>(() => {
    const knownId = ID_TO_NETWORK[chainId];
    const current = knownId ? networkMeta(knownId) : undefined;
    const isCorrect = Boolean(current && current.id === CURRENT_NETWORK.id);

    return {
      expected: CURRENT_NETWORK,
      current,
      isCorrect,
      isConnected,
      switchToExpected: () => switchChain({ chainId: CURRENT_NETWORK.chainId }),
      isSwitching: isPending,
    };
  }, [chainId, isConnected, isPending, switchChain]);
}
