"use client";
import Link from "next/link";
import { motion } from "motion/react";
import type { ActiveSession } from "@/lib/useActiveSessions";

export function LiveRunBanner({ session }: { session: ActiveSession | null }) {
  if (!session) return null;
  const ageSec = Math.round((Date.now() - session.lastTickAt) / 1000);
  return (
    <Link
      href={`/runs/live/${session.runId}`}
      className="block bg-[#0f1623] border border-[#10b98140] rounded-xl px-5 py-3 [@media(hover:hover)and(pointer:fine)]:hover:border-[#10b98170] transition-colors group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Subtle motion pulse — opacity only, no glow */}
          <motion.span
            className="inline-block w-2 h-2 rounded-full bg-[#10b981]"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div>
            <div className="text-[12px] font-medium text-[#10b981]">
              <span className="uppercase tracking-[0.12em] mr-2">Live</span>
              <span className="text-[#e6e9f0] font-medium normal-case">
                Agent #{session.tokenId} · {scenarioLabel(session.scenarioId)}
              </span>
            </div>
            <div className="text-[11px] text-[#6b7691] mt-0.5">
              Last tick {ageSec}s ago · run{" "}
              <span className="font-mono text-[#aab2c5]">{session.runId.slice(0, 10)}…</span>
            </div>
          </div>
        </div>
        <span className="text-[12px] font-medium text-[#10b981] group-hover:translate-x-0.5 transition-transform">
          Watch →
        </span>
      </div>
    </Link>
  );
}

function scenarioLabel(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
