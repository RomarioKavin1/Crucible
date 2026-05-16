"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { fmtSortino } from "@/lib/format";
import { EASE_OUT, DURATION } from "@/lib/motion";

export type RecentRunRow = {
  runId: string;
  tokenId: string;
  agentDescription?: string;
  scenarioLabel: string;
  sortino: number;
  timestamp: number;
};

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function RecentRunsRail({ runs }: { runs: RecentRunRow[] }) {
  return (
    <aside className="lg:sticky lg:top-[72px] self-start">
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1c2538] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981] shrink-0" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-[#10b981] opacity-40 animate-ping" />
            </span>
            <span className="text-[11.5px] font-semibold text-[#e6e9f0] uppercase tracking-[0.08em] truncate">
              On-chain feed
            </span>
          </div>
          <Link href="/leaderboard" className="text-[10.5px] uppercase tracking-[0.1em] text-[#6b7691] hover:text-[#22d3ee] transition-colors font-medium shrink-0">
            All
          </Link>
        </div>
        {/* Subhead */}
        <div className="px-4 py-2 border-b border-[#1c2538] text-[10.5px] text-[#3d4a6e] font-mono">
          straight from RunRegistryV3
        </div>

        {runs.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-[#6b7691]">
            No runs yet.
            <br />
            <span className="text-[11px] text-[#3d4a6e]">Your benchmark will show up here.</span>
          </div>
        ) : (
          <ul className="divide-y divide-[#1c2538]">
            {runs.map((r, i) => (
              <motion.li
                key={r.runId}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: DURATION.dropdown,
                  ease: EASE_OUT,
                  delay: 0.04 * i,
                }}
              >
                <Link
                  href={`/runs/${r.runId}`}
                  className="block px-4 py-3 [@media(hover:hover)and(pointer:fine)]:hover:bg-[#ffffff04] transition-colors group"
                >
                  {/* Top row: token + delta */}
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-1.5 text-[12px] min-w-0">
                      <span className="text-[#22d3ee] font-medium shrink-0">#{r.tokenId}</span>
                      {r.agentDescription && (
                        <span className="text-[#aab2c5] truncate min-w-0">{r.agentDescription}</span>
                      )}
                    </div>
                    <span
                      className="font-mono text-[11.5px] tabular-nums shrink-0 inline-flex items-center gap-0.5"
                      style={{ color: r.sortino >= 0 ? "#10b981" : "#ef4444" }}
                    >
                      <span aria-hidden>{r.sortino >= 0 ? "▲" : "▼"}</span>
                      {fmtSortino(r.sortino)}
                    </span>
                  </div>
                  {/* Bottom row: scenario + time */}
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#6b7691]">
                    <span className="font-mono truncate min-w-0 [@media(hover:hover)and(pointer:fine)]:group-hover:text-[#aab2c5] transition-colors">
                      {r.scenarioLabel}
                    </span>
                    <span className="shrink-0">{timeAgo(r.timestamp)}</span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}

        {/* Footer link */}
        {runs.length > 0 && (
          <Link
            href="/leaderboard"
            className="block border-t border-[#1c2538] px-4 py-2.5 text-[11px] text-[#22d3ee] hover:bg-[#22d3ee08] transition-colors text-center font-medium"
          >
            View full leaderboard →
          </Link>
        )}
      </div>
    </aside>
  );
}
