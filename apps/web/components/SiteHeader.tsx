"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnectButton } from "./WalletConnectButton";
import { GITHUB_REPO_URL } from "@/lib/links";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Scenarios",   href: "/scenarios" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My agents",   href: "/my-agents" },
  { label: "Docs",        href: "/docs" },
];

/**
 * Editorial header. No centered nav, no decorative pill, no underline-spring.
 * Active item is the highest-contrast one — contrast is the indicator.
 * Brand: cyan diamond + wordmark, with a tiny "ver." byline to signal there's
 * a publication behind this. Right rail: github + wallet button.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg/85 backdrop-blur-md">
      <div className="max-w-container-wide mx-auto px-5 md:px-8 h-16 flex items-center gap-6 md:gap-10">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-baseline gap-2.5 shrink-0 group"
          aria-label="Crucible Bench — home"
        >
          <Logo />
          <span className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink whitespace-nowrap">
              Crucible Bench
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-ink-4 tracking-tight">
              v0.4
            </span>
          </span>
        </Link>

        {/* Nav — left-aligned, not centered; contrast is the active indicator */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[13px] font-medium tracking-[-0.005em] whitespace-nowrap transition-colors duration-fast ease-out-quart
                  ${active ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center justify-center w-8 h-8 rounded text-ink-3 hover:text-ink hover:bg-surface-1 transition-colors duration-fast ease-out-quart shrink-0"
          aria-label="GitHub"
        >
          <GithubIcon />
        </a>

        <div className="shrink-0">
          <WalletConnectButton />
        </div>
      </div>

      {/* Mobile nav row — borderless, scrollable */}
      <nav className="md:hidden border-t border-border-subtle flex overflow-x-auto px-5 gap-5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 text-[12.5px] font-medium py-3 transition-colors whitespace-nowrap ${
                active ? "text-ink" : "text-ink-3"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Logo() {
  // PNG → CSS mask so the alpha shape inherits brand cyan without filter drift.
  return (
    <span
      role="img"
      aria-label="Crucible"
      className="inline-block w-[22px] h-[22px] bg-accent translate-y-px"
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
