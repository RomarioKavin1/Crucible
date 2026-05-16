"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAccount, useSwitchChain } from "wagmi";
import { NETWORK_COOKIE, networkMeta, type Network } from "@/lib/network";
import { galileo, mainnet } from "@/lib/chains";
import { PRESS_BUTTON } from "@/lib/motion";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(): Network | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)crucible-network=([^;]+)/);
  const raw = m?.[1];
  if (!raw) return null;
  const v = decodeURIComponent(raw);
  return v === "mainnet" || v === "galileo" ? v : null;
}

function writeCookie(n: Network) {
  document.cookie = `${NETWORK_COOKIE}=${n}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  try { localStorage.setItem("crucible:network", n); } catch {}
}

/**
 * Cycles galileo ↔ mainnet. Persists via cookie + localStorage, asks the
 * wallet to switchChain if connected, then router.refresh() to re-fetch any
 * server-rendered data on the page.
 */
export function NetworkToggle() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<Network>("galileo");
  const router = useRouter();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  // Hydrate from cookie/localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    const c = readCookie();
    if (c) setActive(c);
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[120px]" />;
  }

  const next: Network = active === "galileo" ? "mainnet" : "galileo";
  const meta = networkMeta(active);

  async function toggle() {
    writeCookie(next);
    setActive(next);
    // Ask wallet to switch chains too. Errors here are non-fatal (user may decline).
    if (isConnected) {
      try {
        const target = next === "mainnet" ? mainnet : galileo;
        await switchChain({ chainId: target.id });
      } catch { /* user declined, that's fine */ }
    }
    // Re-fetch any server-rendered data on the current page.
    router.refresh();
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      {...PRESS_BUTTON}
      title={`Click to switch to ${networkMeta(next).label}`}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[#1c2538] bg-[#0f1623] [@media(hover:hover)and(pointer:fine)]:hover:border-[#232d44] transition-colors text-[11.5px] font-medium whitespace-nowrap"
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${meta.testnet ? "bg-[#fbbf24]" : "bg-[#10b981]"}`}
        aria-hidden
      />
      <span className="text-[#e6e9f0]">{meta.label}</span>
      {meta.testnet && (
        <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-[#fbbf24]">
          Testnet
        </span>
      )}
      <span className="text-[#3d4a6e] text-[10px]" aria-hidden>⇄</span>
    </motion.button>
  );
}
