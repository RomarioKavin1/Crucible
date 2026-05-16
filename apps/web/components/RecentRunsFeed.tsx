import { fetchAllRunsV2 } from "@/lib/leaderboard";
import { decodeScenarioHash } from "@/lib/scenarios";
import { RecentRunsRail, type RecentRunRow } from "./RecentRunsRail";

/**
 * Server component: pulls recent runs from V3 + decodes scenario hashes,
 * then hands the typed rows to the client-side <RecentRunsRail/> for
 * animated rendering.
 */
export async function RecentRunsFeed() {
  const runs = await fetchAllRunsV2();
  const recent = runs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

  const decoded = await Promise.all(recent.map((r) => decodeScenarioHash(r.scenarioId)));

  const rows: RecentRunRow[] = recent.map((r, i) => ({
    runId: r.runId,
    tokenId: r.tokenId.toString(),
    agentDescription: r.agentDescription || undefined,
    scenarioLabel: decoded[i] ?? `${r.scenarioId.slice(0, 10)}…`,
    sortino: r.sortino,
    timestamp: r.timestamp,
  }));

  return <RecentRunsRail runs={rows} />;
}
