import { NextResponse } from "next/server";
import { fetchAllRunsV3 } from "@/lib/leaderboard";
import { decodeScenarioHash } from "@/lib/scenarios";

export const revalidate = 0;          // never ISR-cache; rail polls every 15s
export const dynamic = "force-dynamic";

/**
 * Returns up to N most recent V3 runs for the landing-page rail.
 *
 * Why a dedicated endpoint? The /api/leaderboard route caches at 60s and
 * exposes a different shape (rows-by-token-aggregation). This is single-row,
 * minimal, and always fresh — the rail polls it on the client.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "8", 10)));

  try {
    const runs = await fetchAllRunsV3();
    const recent = runs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    const decoded = await Promise.all(recent.map((r) => decodeScenarioHash(r.scenarioId)));

    const rows = recent.map((r, i) => ({
      runId: r.runId,
      tokenId: r.tokenId.toString(),
      agentDescription: r.agentDescription || "",
      scenarioLabel: decoded[i] ?? `${r.scenarioId.slice(0, 10)}…`,
      sortino: r.sortino,
      timestamp: r.timestamp,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json(
      { rows: [], error: e instanceof Error ? e.message : String(e) },
      { status: 200 },        // soft-fail so the rail just shows empty
    );
  }
}
