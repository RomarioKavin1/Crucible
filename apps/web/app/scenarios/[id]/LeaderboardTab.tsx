"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { V2LeaderboardRow } from "@/lib/leaderboard";
import { fmtSortino, fmtPct } from "@/lib/format";

export function LeaderboardTab({ scenarioId }: { scenarioId: string }) {
  const [rows, setRows] = useState<V2LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(
          `/api/leaderboard?source=v2&scenarioId=${encodeURIComponent(scenarioId)}`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { rows: V2LeaderboardRow[] };
        setRows(data.rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [scenarioId]);

  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef444466] rounded-2xl p-4 text-[#ef4444] text-[13px]">
        Failed to load leaderboard: {error}
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">
        Loading on-chain runs…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">
        No runs published for this scenario yet. Be the first — copy the CLI snippet on the Overview tab.
      </div>
    );
  }

  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
      <div className="grid grid-cols-[40px_1fr_120px_120px_120px_80px] gap-3 px-5 py-3 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
        <div>#</div>
        <div>Agent</div>
        <div className="text-right">Sortino</div>
        <div className="text-right">Return</div>
        <div className="text-right">Max DD</div>
        <div className="text-right">Verify</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.runId}
          className="grid grid-cols-[40px_1fr_120px_120px_120px_80px] gap-3 px-5 py-3 border-b border-[#1c253855] last:border-0 hover:bg-[#ffffff03] transition-colors items-center"
        >
          <div className="font-mono text-[#6b7691]">{i + 1}</div>
          <div>
            <Link
              className="text-[14px] font-medium text-[#22d3ee] hover:underline inline-flex items-center gap-1.5"
              href={`/agents/${r.tokenId}`}
            >
              <span>◆</span>
              <span>#{r.tokenId}</span>
            </Link>
            {r.agentDescription && (
              <div className="font-mono text-[11px] text-[#6b7691] mt-0.5 truncate max-w-[180px]">
                {r.agentDescription}
              </div>
            )}
          </div>
          <div className="font-mono text-right text-[#e6e9f0] self-center">{fmtSortino(r.sortino)}</div>
          <div
            className="font-mono text-right self-center"
            style={{ color: r.totalReturn >= 0 ? "#10b981" : "#ef4444" }}
          >
            <span className="text-[10px] mr-1">{r.totalReturn >= 0 ? "▲" : "▼"}</span>
            {fmtPct(r.totalReturn)}
          </div>
          <div className="font-mono text-right text-[#ef4444] self-center">
            {fmtPct(Math.abs(r.maxDrawdown))}
          </div>
          <div className="text-right self-center">
            <Link className="text-[12px] text-[#22d3ee] hover:underline" href={`/verify/${r.runId}`}>
              audit →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
