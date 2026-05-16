import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchAllRunsV3ForNetwork } from "@/lib/leaderboard";
import { decodeScenarioHash } from "@/lib/scenarios";
import { NETWORK_COOKIE, type Network } from "@/lib/network";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * Most-recent V3 runs for the landing-page rail. Reads the `crucible-network`
 * cookie so the rail mirrors whichever network the user toggled to.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "8", 10)));

  // Cookie wins; query param is a fallback (lets callers force a specific net).
  const cookieValue = cookies().get(NETWORK_COOKIE)?.value;
  const fromQuery = url.searchParams.get("network");
  const requested = cookieValue ?? fromQuery;
  const network: Network = requested === "mainnet" ? "mainnet" : "galileo";

  try {
    const runs = await fetchAllRunsV3ForNetwork(network);
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

    return NextResponse.json({ rows, network });
  } catch (e) {
    return NextResponse.json(
      { rows: [], network, error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
