// packages/mcp-server/src/tools/get-my-runs.ts
import type { RunRegistryV2Client } from "@crucible/og-client";

export async function handleGetMyRuns(opts: {
  registry: RunRegistryV2Client;
  tokenId: bigint;
}) {
  const ids = await opts.registry.getRunsByToken(opts.tokenId);
  const records = await Promise.all(ids.map((id) => opts.registry.getRun(id)));
  return records.map((r, i) => ({
    runId: ids[i]!.toString(),
    scenarioId: r.scenarioId,
    scoreSortinoE6: r.scoreSortinoE6.toString(),
    totalReturnE6: r.totalReturnE6.toString(),
    maxDrawdownE6: r.maxDrawdownE6.toString(),
    timestamp: Number(r.timestamp),
    runUrl: `https://cruciblebench.xyz/runs/${ids[i]!.toString()}`,
  }));
}
