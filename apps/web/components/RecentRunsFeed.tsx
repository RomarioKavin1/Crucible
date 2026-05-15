import Link from "next/link";
import { fetchAllRunsV2 } from "@/lib/leaderboard";
import { fmtSortino } from "@/lib/format";
import { decodeScenarioHash } from "@/lib/scenarios";

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export async function RecentRunsFeed() {
  const runs = await fetchAllRunsV2();
  const recent = runs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  // Decode scenario hashes server-side
  const decodedScenarios = await Promise.all(
    recent.map((r) => decodeScenarioHash(r.scenarioId))
  );

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Recent runs</h2>
        <Link href="/leaderboard" className="text-[12px] text-[#22d3ee] hover:underline">
          View leaderboard →
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-8 text-center text-[12px] text-[#6b7691]">
          No runs yet.
        </div>
      ) : (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated divide-y divide-[#1c2538]">
          {recent.map((r, i) => {
            const scenarioName = decodedScenarios[i];
            const scenarioLabel = scenarioName ?? `${r.scenarioId.slice(0, 10)}…`;
            return (
              <Link key={r.runId} href={`/runs/${r.runId}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#ffffff03] transition-colors">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="text-[#22d3ee] font-medium">Token #{r.tokenId}</span>
                  <span className="text-[#3a4456]">·</span>
                  <span className="text-[#aab2c5]">{r.agentDescription || scenarioLabel}</span>
                  <span className="text-[#3a4456]">·</span>
                  <span className="text-[#6b7691] font-mono text-[11px]">{scenarioLabel}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[12px]" style={{ color: r.sortino >= 0 ? "#10b981" : "#ef4444" }}>
                    {r.sortino >= 0 ? "▲" : "▼"} {fmtSortino(r.sortino)}
                  </span>
                  <span className="text-[11px] text-[#6b7691]">{timeAgo(r.timestamp)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
