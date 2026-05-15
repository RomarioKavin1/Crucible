"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "motion/react";
import { OgMark } from "./OgMark";
import { WalletConnectButton } from "./WalletConnectButton";
import { GITHUB_REPO_URL } from "@/lib/links";
import { PRESS_BUTTON } from "@/lib/motion";
import { CURRENT_NETWORK } from "@/lib/network";

type NavItem = { label: string; href: string; badge?: string };

const NAV: NavItem[] = [
  { label: "Scenarios",   href: "/scenarios" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My Agents",   href: "/my-agents" },
  { label: "Docs",        href: "/docs" },
  { label: "Community",   href: "/community", badge: "Soon" },
];

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <header className="border-b border-[#1c2538] bg-[#0a0e17]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="text-[14px] font-semibold tracking-tight text-[#e6e9f0]">Crucible</span>
        </Link>

        {/* Nav with shared underline indicator */}
        <LayoutGroup id="site-nav">
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3 py-1.5 group inline-flex items-center gap-1.5"
                >
                  <span
                    className={`text-[12.5px] font-medium transition-colors ${
                      active ? "text-[#e6e9f0]" : "text-[#6b7691] group-hover:text-[#aab2c5]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-[0.1em] font-semibold px-1 py-px rounded bg-[#fbbf2415] text-[#fbbf24] border border-[#fbbf2433]">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-[15px] left-2 right-2 h-[2px] bg-[#22d3ee] rounded-full"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="flex-1" />

        {/* 0G chain pill — reads from CURRENT_NETWORK so it follows env switches */}
        <a
          href={CURRENT_NETWORK.explorerBase}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#1c2538] bg-[#0f1623] hover:border-[#232d44] transition-colors text-[11px] text-[#aab2c5]"
          title={`${CURRENT_NETWORK.label} ${CURRENT_NETWORK.testnet ? "testnet" : "mainnet"}, chain ${CURRENT_NETWORK.chainId}`}
        >
          <OgMark size={11} className="text-[#22d3ee]" />
          <span className="font-medium text-[#e6e9f0]">{CURRENT_NETWORK.label}</span>
          <span className="text-[#3d4a6e]">·</span>
          <span className="font-mono text-[10.5px] text-[#6b7691]">{CURRENT_NETWORK.chainId}</span>
        </a>

        {/* Github icon */}
        <motion.a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          {...PRESS_BUTTON}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[#6b7691] hover:text-[#e6e9f0] hover:bg-[#ffffff06] transition-colors"
          aria-label="GitHub"
        >
          <GithubIcon />
        </motion.a>

        <WalletConnectButton />
      </div>

      {/* Mobile nav row */}
      <nav className="md:hidden border-t border-[#1c2538] flex overflow-x-auto px-4 gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-2.5 transition-colors ${
                active ? "text-[#22d3ee] border-b-2 border-[#22d3ee] -mb-px" : "text-[#6b7691]"
              }`}
            >
              {item.label}
              {item.badge && (
                <span className="text-[9px] uppercase tracking-[0.1em] font-semibold px-1 py-px rounded bg-[#fbbf2415] text-[#fbbf24] border border-[#fbbf2433]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Logo() {
  // Solid-cyan monogram — same shape as the old gradient logo, but flat.
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M22 7 L14 2 L6 7 L6 21 L14 26 L22 21 L22 17 L14 21 L10 18 L10 10 L14 7 L22 11 Z"
        fill="#22d3ee"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"
      />
    </svg>
  );
}
