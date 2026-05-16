import Link from "next/link";
import { OgMark } from "./OgMark";
import { GITHUB_REPO_URL, NPM_BENCH_URL, NPM_CREATE_URL, PROTOCOL_DOC_URL } from "@/lib/links";

/**
 * Editorial colophon footer. Pull-quote tagline on the left, three thin link
 * columns on the right. Bottom byline carries the credits. No 4-column SaaS
 * footer grid.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border-subtle">
      <div className="max-w-container-wide mx-auto px-5 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
          {/* Tagline column — editorial pull-quote */}
          <div className="md:col-span-6 lg:col-span-7">
            <Link href="/" className="inline-flex items-baseline gap-2.5 group">
              <Logo />
              <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
                Crucible Bench
              </span>
            </Link>
            <p className="mt-5 text-[20px] leading-[1.35] font-light tracking-[-0.01em] text-ink-2 max-w-[34ch]">
              Every per-tick action signed.
              <br className="hidden md:block" />
              <span className="text-ink-3"> Every score on chain.</span>
            </p>
          </div>

          {/* Link columns */}
          <FooterCol title="Product" className="md:col-span-3 lg:col-span-2">
            <FooterLink href="/scenarios">Scenarios</FooterLink>
            <FooterLink href="/leaderboard">Leaderboard</FooterLink>
            <FooterLink href="/my-agents">My agents</FooterLink>
            <FooterLink href="/docs">Docs</FooterLink>
          </FooterCol>

          <FooterCol title="Build" className="md:col-span-3 lg:col-span-2">
            <FooterLink href={NPM_BENCH_URL} external>crucible-bench</FooterLink>
            <FooterLink href={NPM_CREATE_URL} external>create-crucible-agent</FooterLink>
            <FooterLink href={PROTOCOL_DOC_URL} external>Protocol spec</FooterLink>
            <FooterLink href={GITHUB_REPO_URL} external>GitHub</FooterLink>
          </FooterCol>
        </div>

        {/* Colophon — typographic byline, no boxed bar */}
        <div className="mt-12 pt-6 border-t border-border-subtle flex items-center justify-between gap-4 flex-wrap text-[11.5px] text-ink-3">
          <div className="flex items-center gap-2 font-mono">
            <span>Built on</span>
            <a
              href="https://0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink-2 hover:text-accent transition-colors duration-fast ease-out-quart"
            >
              <OgMark size={11} />
              <span className="font-sans font-medium">0G</span>
            </a>
            <span className="text-ink-4">·</span>
            <span>Chain · Storage · Compute</span>
          </div>
          <div className="font-mono">
            MIT · 0G APAC Hackathon 2026
          </div>
        </div>
      </div>
    </footer>
  );
}

function Logo() {
  return (
    <span
      role="img"
      aria-label="Crucible"
      className="inline-block w-[20px] h-[20px] bg-accent translate-y-px"
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

function FooterCol({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-eyebrow">{title}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const isExternal = external || href.startsWith("http");
  const cls = "text-[13px] text-ink-2 hover:text-ink transition-colors duration-fast ease-out-quart inline-flex items-center gap-1";
  if (isExternal) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
          <span className="text-ink-4 text-[10px]">↗</span>
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={cls}>
        {children}
      </Link>
    </li>
  );
}
