import Link from "next/link";
import { OgMark } from "./OgMark";
import { GITHUB_REPO_URL, NPM_BENCH_URL, NPM_CREATE_URL, PROTOCOL_DOC_URL } from "@/lib/links";
import { CURRENT_NETWORK } from "@/lib/network";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1c2538] mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden>
                <path
                  d="M22 7 L14 2 L6 7 L6 21 L14 26 L22 21 L22 17 L14 21 L10 18 L10 10 L14 7 L22 11 Z"
                  fill="#22d3ee"
                />
              </svg>
              <span className="text-[14px] font-semibold text-[#e6e9f0]">Crucible</span>
            </Link>
            <p className="text-[12px] text-[#6b7691] leading-relaxed max-w-[26ch]">
              Verifiable benchmarks for autonomous AI trading agents.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink href="/scenarios">Scenarios</FooterLink>
            <FooterLink href="/leaderboard">Leaderboard</FooterLink>
            <FooterLink href="/my-agents">My Agents</FooterLink>
            <FooterLink href="/docs">Docs</FooterLink>
          </FooterCol>

          <FooterCol title="Developers">
            <FooterLink href={NPM_BENCH_URL} external>crucible-bench</FooterLink>
            <FooterLink href={NPM_CREATE_URL} external>create-crucible-agent</FooterLink>
            <FooterLink href={PROTOCOL_DOC_URL} external>Protocol spec</FooterLink>
            <FooterLink href={GITHUB_REPO_URL} external>GitHub</FooterLink>
          </FooterCol>

          <FooterCol title="Network">
            <FooterLink href={CURRENT_NETWORK.explorerBase} external>{CURRENT_NETWORK.label} explorer</FooterLink>
            <FooterLink href="https://0g.ai" external>0G website</FooterLink>
            <FooterLink href="https://docs.0g.ai" external>0G docs</FooterLink>
          </FooterCol>
        </div>

        {/* Built-on bar */}
        <div className="border-t border-[#1c2538] pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-[#6b7691]">
            <span>Built on</span>
            <a
              href="https://0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#aab2c5] hover:text-[#22d3ee] transition-colors"
            >
              <OgMark size={11} className="text-[#22d3ee]" />
              <span className="font-medium">0G</span>
            </a>
            <span className="text-[#3d4a6e]">·</span>
            <span>Storage · Chain · Compute</span>
          </div>
          <div className="text-[11px] text-[#6b7691]">
            MIT License · 0G APAC Hackathon 2026
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">{title}</div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  const isExternal = external || href.startsWith("http");
  if (isExternal) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[#aab2c5] hover:text-[#e6e9f0] transition-colors inline-flex items-center gap-1"
        >
          {children}
          <span className="text-[#3d4a6e] text-[10px]">↗</span>
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="text-[12px] text-[#aab2c5] hover:text-[#e6e9f0] transition-colors">
        {children}
      </Link>
    </li>
  );
}
