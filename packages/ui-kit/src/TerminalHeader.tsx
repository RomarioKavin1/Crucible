import Link from "next/link";

export interface TerminalHeaderProps {
  /** "PROVING GROUND" for the public web app, "LAB" for the local app, etc. */
  tagline: string;
  /** "GALILEO  chain 16602" or "localhost:3002 / GALILEO" */
  network: string;
  /** Nav items to render under the wordmark. Active item gets a cyan underline. */
  nav?: { label: string; href: string }[];
  /** Path of the currently-active nav item, used to underline. */
  activePath?: string;
  /** Optional slot rendered to the right of the network indicator (e.g. wallet connect button). */
  rightSlot?: React.ReactNode;
}

export function TerminalHeader({ tagline, network, nav = [], activePath, rightSlot }: TerminalHeaderProps) {
  return (
    <header className="border-b border-[#1c2538] bg-[#0a0e17]/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monogram />
            <Link href="/" className="text-[15px] font-semibold tracking-tight text-[#e6e9f0]">
              Crucible
            </Link>
            <span className="text-[10px] tracking-[0.12em] text-[#6b7691] uppercase font-medium border-l border-[#1c2538] pl-3 ml-1">
              {tagline}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] text-[#aab2c5]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22d3ee] shadow-[0_0_8px_#22d3eeaa]" />
              </span>
              <span className="font-mono">{network}</span>
            </div>
            {rightSlot}
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="mt-3 flex gap-1">
            {nav.map((item) => {
              const active = activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-[#22d3ee15] text-[#22d3ee]"
                      : "text-[#6b7691] hover:text-[#e6e9f0] hover:bg-[#ffffff05]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

function Monogram() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cMono" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path
        d="M22 7 L14 2 L6 7 L6 21 L14 26 L22 21 L22 17 L14 21 L10 18 L10 10 L14 7 L22 11 Z"
        fill="url(#cMono)"
      />
    </svg>
  );
}
