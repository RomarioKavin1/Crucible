"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "motion/react";
import { WalletConnectButton } from "./WalletConnectButton";
import { GITHUB_REPO_URL } from "@/lib/links";
import { PRESS_BUTTON } from "@/lib/motion";

type NavItem = { label: string; href: string; soon?: boolean };

const NAV: NavItem[] = [
  { label: "Scenarios",   href: "/scenarios" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My Agents",   href: "/my-agents" },
  { label: "Docs",        href: "/docs" },
  { label: "Community",   href: "/community", soon: true },
];

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <header className="border-b border-[#1c2538] bg-[#0a0e17]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center gap-4 md:gap-6">
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
                  className="relative px-2.5 py-1.5 group inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span
                    className={`text-[12.5px] font-medium transition-colors ${
                      active ? "text-[#e6e9f0]" : "text-[#6b7691] group-hover:text-[#aab2c5]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.soon && (
                    <span className="text-[8.5px] uppercase tracking-[0.08em] font-medium text-[#6b7691] border border-[#1c2538] rounded px-1 py-px leading-none">
                      Soon
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

        {/* Github icon (hidden on small screens) */}
        <motion.a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          {...PRESS_BUTTON}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[#6b7691] hover:text-[#e6e9f0] hover:bg-[#ffffff06] transition-colors shrink-0"
          aria-label="GitHub"
        >
          <GithubIcon />
        </motion.a>

        {/* Themed wallet button — owns chain status + address + actions */}
        <div className="shrink-0">
          <WalletConnectButton />
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="md:hidden border-t border-[#1c2538] flex overflow-x-auto px-4 gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-2.5 transition-colors whitespace-nowrap ${
                active ? "text-[#22d3ee] border-b-2 border-[#22d3ee] -mb-px" : "text-[#6b7691]"
              }`}
            >
              {item.label}
              {item.soon && (
                <span className="text-[8.5px] uppercase tracking-[0.08em] font-medium text-[#6b7691] border border-[#1c2538] rounded px-1 py-px leading-none">
                  Soon
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
  // PNG → CSS mask so the alpha shape inherits the brand cyan cleanly.
  // No filter chain drift, no color shift across browsers.
  return (
    <span
      role="img"
      aria-label="Crucible"
      className="inline-block w-6 h-6 bg-[#22d3ee]"
      style={{
        WebkitMaskImage: "url(/crucible.png)",
        maskImage: "url(/crucible.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
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
