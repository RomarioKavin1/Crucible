"use client";
import Link from "next/link";
import type { ActiveSession } from "@/lib/useActiveSessions";

export function LiveRunBanner({ session }: { session: ActiveSession | null }) {
  if (!session) return null;
  const ageSec = Math.round((Date.now() - session.lastTickAt) / 1000);
  return (
    <Link
      href={`/runs/live/${session.runId}`}
      className="block bg-[#10b98115] border border-[#10b98140] rounded-xl px-5 py-3 hover:bg-[#10b98125] transition-colors group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse" />
          <div>
            <div className="text-[13px] font-medium text-[#10b981]">
              LIVE — Agent #{session.tokenId} on {scenarioLabel(session.scenarioId)}
            </div>
            <div className="text-[11px] text-[#aab2c5] mt-0.5">
              Last tick {ageSec}s ago · runId{" "}
              <span className="font-mono">{session.runId.slice(0, 10)}…</span>
            </div>
          </div>
        </div>
        <span className="text-[12px] text-[#10b981] group-hover:translate-x-0.5 transition-transform">
          Watch live →
        </span>
      </div>
    </Link>
  );
}

function scenarioLabel(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
