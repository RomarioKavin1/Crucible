"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OgMark } from "./OgMark";
import { useWallet } from "@/lib/hooks/useWallet";
import { useNetwork } from "@/lib/hooks/useNetwork";
import { explorerAddress } from "@/lib/network";
import { PRESS_BUTTON, EASE_OUT, DURATION } from "@/lib/motion";

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // SSR placeholder — match collapsed button width so the header doesn't reflow.
  if (!mounted) return <div className="h-8 w-36" />;

  return <WalletButtonImpl />;
}

function WalletButtonImpl() {
  const { address, formattedAddress, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { expected, current, isCorrect, switchToExpected, isSwitching } = useNetwork();

  // ── Disconnected ──────────────────────────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <motion.button
        type="button"
        onClick={connect}
        {...PRESS_BUTTON}
        disabled={isConnecting}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] transition-colors disabled:opacity-60"
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </motion.button>
    );
  }

  // ── Wrong network ─────────────────────────────────────────────────────────
  if (!isCorrect) {
    return (
      <motion.button
        type="button"
        onClick={switchToExpected}
        {...PRESS_BUTTON}
        disabled={isSwitching}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#fbbf2415] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#fbbf2425] border border-[#fbbf2455] text-[#fbbf24] transition-colors disabled:opacity-60 whitespace-nowrap"
        title={current ? `Currently on ${current.label} (chain ${current.chainId})` : "Unsupported chain"}
      >
        <span aria-hidden>⚠</span>
        {isSwitching ? `Switching…` : `Switch to ${expected.label}`}
      </motion.button>
    );
  }

  // ── Connected on the expected network ────────────────────────────────────
  return (
    <ConnectedPill
      address={address}
      formattedAddress={formattedAddress}
      networkLabel={expected.label}
      isTestnet={expected.testnet}
      chainId={expected.chainId}
      onDisconnect={disconnect}
    />
  );
}

function ConnectedPill({
  address, formattedAddress, networkLabel, isTestnet, chainId, onDisconnect,
}: {
  address: `0x${string}`;
  formattedAddress: string;
  networkLabel: string;
  isTestnet: boolean;
  chainId: number;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unsupported */ }
  }

  return (
    <div className="relative" ref={popRef}>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        {...PRESS_BUTTON}
        className="group inline-flex items-center gap-2 h-8 pl-2 pr-2.5 rounded-lg border border-[#1c2538] bg-[#0f1623] [@media(hover:hover)and(pointer:fine)]:hover:border-[#232d44] transition-colors whitespace-nowrap"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {/* Network chip */}
        <span className="inline-flex items-center gap-1.5 text-[11.5px]">
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22d3ee]"
            aria-hidden
          >
            <span className="absolute inset-0 rounded-full bg-[#22d3ee] opacity-40 animate-ping" />
          </span>
          <span className="font-medium text-[#aab2c5]">{networkLabel}</span>
          {isTestnet && (
            <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-[#fbbf24]">
              Testnet
            </span>
          )}
        </span>
        <span className="text-[#1c2538]" aria-hidden>·</span>
        {/* Address */}
        <span className="font-mono text-[12px] text-[#e6e9f0]">{formattedAddress}</span>
        <span
          className={`text-[#6b7691] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
            className="absolute right-0 mt-2 w-[260px] origin-top-right bg-[#0f1623] border border-[#1c2538] rounded-xl card-elevated overflow-hidden z-50"
          >
            {/* Header card */}
            <div className="px-3 py-2.5 border-b border-[#1c2538]">
              <div className="flex items-center gap-2 mb-1">
                <OgMark size={11} className="text-[#22d3ee]" />
                <span className="text-[11px] text-[#aab2c5] font-medium">{networkLabel}</span>
                {isTestnet && (
                  <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-[#fbbf24]">
                    Testnet
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-[#3d4a6e]">chain {chainId}</span>
              </div>
              <div className="font-mono text-[11px] text-[#e6e9f0] break-all leading-snug">
                {address}
              </div>
            </div>
            {/* Actions */}
            <div className="py-1">
              <MenuItem onClick={() => { copy(); }}>
                <span>{copied ? "Copied" : "Copy address"}</span>
                <span className={`text-[10.5px] ${copied ? "text-[#10b981]" : "text-[#3d4a6e]"}`}>
                  {copied ? "✓" : "⧉"}
                </span>
              </MenuItem>
              <MenuItem
                href={explorerAddress(address)}
                external
              >
                <span>View on explorer</span>
                <span className="text-[10.5px] text-[#3d4a6e]">↗</span>
              </MenuItem>
              <div className="my-1 border-t border-[#1c2538]" />
              <MenuItem onClick={() => { setOpen(false); onDisconnect(); }} danger>
                <span>Disconnect</span>
                <span className="text-[10.5px] text-[#3d4a6e]">⏻</span>
              </MenuItem>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  children, onClick, href, external, danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
}) {
  const cls = `flex items-center justify-between gap-3 w-full px-3 py-2 text-[12px] text-left transition-colors ${
    danger
      ? "text-[#fca5a5] hover:bg-[#7f1d1d20] hover:text-[#fecaca]"
      : "text-[#aab2c5] hover:bg-[#ffffff05] hover:text-[#e6e9f0]"
  }`;
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls} role="menuitem">
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} role="menuitem">
      {children}
    </button>
  );
}
