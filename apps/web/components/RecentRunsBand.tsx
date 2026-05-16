"use client";
import Link from "next/link";
import useSWR from "swr";
import { fmtSortino } from "@/lib/format";

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
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Editorial "what just ran" band. Replaces the sidebar rail with a full-width
 * borderless table — three columns of typography, no card chrome. Polls every
 * 15s. Empty state is honest (no fake seed data).
 */
export function RecentRunsBand() {
  const { data, isLoading } = useSWR<{ rows: RecentRunRow[] }>(
    "/api/recent-runs?limit=8",
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );
  const runs = data?.rows ?? [];

  return (
    <section className="py-16 md:py-20 border-t border-border-subtle">
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 mb-10 md:mb-12">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-up opacity-50 animate-ping" />
            </span>
            <span className="text-eyebrow !text-up">On-chain feed</span>
          </div>
          <h2 className="text-h2 text-ink">What just ran.</h2>
          <p className="mt-3 text-[14px] text-ink-3 font-mono">
            straight from RunRegistryV3 · polls every 15s
          </p>
        </div>
        <div className="lg:col-span-4 lg:flex lg:items-end lg:justify-end">
          <Link href="/leaderboard" className="editorial-link text-[14px] font-medium">
            Full leaderboard →
          </Link>
        </div>
      </header>

      <div className="border-t border-border-subtle">
        {isLoading && runs.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-ink-3 italic">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-[14px] text-ink-2">No runs yet on this network.</div>
            <div className="text-[12px] text-ink-4 font-mono mt-2">your benchmark could be first.</div>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {runs.map((r) => (
              <li key={r.runId}>
                <Link
                  href={`/runs/${r.runId}`}
                  className="group grid grid-cols-12 gap-x-4 items-baseline py-4 md:py-5 hover:bg-surface-1/40 -mx-5 px-5 md:-mx-8 md:px-8 transition-colors duration-fast ease-out-quart"
                >
                  {/* Run id */}
                  <div className="col-span-2 md:col-span-1 font-mono text-[12.5px] text-ink-3">
                    #{r.runId}
                  </div>
                  {/* Agent */}
                  <div className="col-span-10 md:col-span-5 flex items-baseline gap-2 min-w-0">
                    <span className="text-accent font-mono text-[12.5px] shrink-0">#{r.tokenId}</span>
                    <span className="text-[14px] text-ink truncate group-hover:text-accent transition-colors duration-fast ease-out-quart">
                      {r.agentDescription || "—"}
                    </span>
                  </div>
                  {/* Scenario */}
                  <div className="hidden md:block md:col-span-3 font-mono text-[12px] text-ink-3 truncate">
                    {r.scenarioLabel}
                  </div>
                  {/* Sortino */}
                  <div
                    className={`col-span-6 md:col-span-2 text-right font-mono text-[14px] tabular-nums tracking-tight ${
                      r.sortino >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    <span className="text-ink-4 mr-1.5">{r.sortino >= 0 ? "▲" : "▼"}</span>
                    {fmtSortino(r.sortino)}
                  </div>
                  {/* Time */}
                  <div className="col-span-6 md:col-span-1 text-right font-mono text-[11.5px] text-ink-4">
                    {timeAgo(r.timestamp)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
