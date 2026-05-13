"use client";
import { useEffect, useState } from "react";
import { PerScenarioTable } from "@/components/LeaderboardTable";
import type { LeaderboardRow } from "@/lib/leaderboard";

export function LeaderboardTab({ scenarioId }: { scenarioId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/leaderboard?scenarioId=${encodeURIComponent(scenarioId)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { rows: LeaderboardRow[] };
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
    return <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">Loading on-chain runs…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">
        No runs published for this scenario yet. Be the first — copy the CLI snippet on the Overview tab.
      </div>
    );
  }
  return <PerScenarioTable rows={rows} />;
}
