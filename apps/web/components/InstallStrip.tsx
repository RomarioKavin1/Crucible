"use client";
import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { NPM_BENCH_URL, NPM_CREATE_URL } from "@/lib/links";
import { PRESS_BUTTON } from "@/lib/motion";

const PACKAGES = [
  {
    name: "crucible-bench",
    tagline: "One command. Any LLM provider. No clone.",
    install: "npx crucible-bench -s fakeout-pump --provider openai --model gpt-4o-mini --watch",
    href: NPM_BENCH_URL,
    badge: "CLI",
  },
  {
    name: "create-crucible-agent",
    tagline: "Scaffold a project when you want to edit the prompt + strategy",
    install: "pnpm create crucible-agent",
    href: NPM_CREATE_URL,
    badge: "Scaffolder",
  },
];

export function InstallStrip() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {PACKAGES.map((p) => (
        <PackageCard key={p.name} pkg={p} />
      ))}
    </section>
  );
}

function PackageCard({ pkg }: { pkg: typeof PACKAGES[number] }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pkg.install);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {/* clipboard unsupported */}
  }

  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-4 [@media(hover:hover)and(pointer:fine)]:hover:border-[#232d44] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#22d3ee] bg-[#22d3ee0a] border border-[#22d3ee44] rounded px-1.5 py-0.5">
              {pkg.badge}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">npm</span>
          </div>
          <div className="font-mono text-[14px] font-semibold text-[#e6e9f0] truncate">{pkg.name}</div>
          <div className="text-[12px] text-[#aab2c5] mt-0.5">{pkg.tagline}</div>
        </div>
        <Link
          href={pkg.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#6b7691] hover:text-[#22d3ee] transition-colors shrink-0 mt-0.5"
        >
          npm ↗
        </Link>
      </div>
      <div className="flex items-stretch gap-0 bg-[#0a0e17] border border-[#1c2538] rounded-lg overflow-hidden">
        <code className="flex-1 px-3 py-2 font-mono text-[11.5px] text-[#e6e9f0] overflow-x-auto whitespace-nowrap">
          {pkg.install}
        </code>
        <motion.button
          {...PRESS_BUTTON}
          onClick={copy}
          className="px-3 text-[10.5px] font-medium uppercase tracking-[0.08em] border-l border-[#1c2538] text-[#aab2c5] hover:text-[#22d3ee] hover:bg-[#ffffff04] transition-colors shrink-0"
          aria-label={copied ? "Copied" : "Copy command"}
        >
          {copied ? "✓ Copied" : "Copy"}
        </motion.button>
      </div>
    </div>
  );
}
