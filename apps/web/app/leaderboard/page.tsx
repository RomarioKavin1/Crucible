import Link from "next/link";
import { cookies } from "next/headers";
import { fetchAllRunsV3ForNetwork, fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";
import { buildScenarioHashMap, listScenarios as listLocalScenarios } from "@/lib/scenarios";
import { LeaderboardClient, type V2Row } from "./LeaderboardClient";
import { NETWORK_COOKIE, networkMeta, type Network } from "@/lib/network";

// Force per-request rendering so the cookie-driven network choice always applies.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams?: { source?: string } }) {
  const source = searchParams?.source === "v1" ? "v1" : "v2";

  if (source === "v1") {
    const runs = await fetchAllRuns();
    const scenarios = await listScenarios(runs);
    const aggregated = aggregateByAgent(runs);
    const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
    return (
      <div className="space-y-6">
        <Header source="v1" />
        <StatsStrip totalRuns={runs.length} totalAgents={aggregated.length} totalScenarios={scenarios.length}
          lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
        <ScenarioFilterTabs scenarios={scenarios} />
        {aggregated.length === 0 ? <EmptyState /> : <OverallTable rows={aggregated} />}
      </div>
    );
  }

  // Honor the network cookie the user toggled in the header.
  const cookieValue = cookies().get(NETWORK_COOKIE)?.value;
  const network: Network = cookieValue === "mainnet" ? "mainnet" : "galileo";
  const netMeta = networkMeta(network);

  const [runs, localScenarios] = await Promise.all([
    fetchAllRunsV3ForNetwork(network),
    listLocalScenarios(),
  ]);
  const scenarioHashMap = buildScenarioHashMap(localScenarios.map((s) => s.id));
  const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  const uniqueTokens = new Set(runs.map((r) => r.tokenId)).size;
  const uniqueScenarios = new Set(runs.map((r) => r.scenarioId)).size;

  // Resolve scenario hashes to names once on the server.
  const enriched: V2Row[] = runs.map((r) => ({
    ...r,
    scenarioName: scenarioHashMap.get(r.scenarioId.toLowerCase()) ?? null,
  }));

  return (
    <div className="space-y-6">
      <Header source="v2" networkLabel={netMeta.label} isTestnet={netMeta.testnet} />
      <StatsStrip totalRuns={runs.length} totalAgents={uniqueTokens} totalScenarios={uniqueScenarios}
        lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
      {runs.length === 0 ? (
        <EmptyState networkLabel={netMeta.label} />
      ) : (
        <LeaderboardClient
          rows={enriched}
          scenarios={localScenarios.map((s) => ({ id: s.id, title: s.title }))}
        />
      )}
    </div>
  );
}

function Header({ source, networkLabel, isTestnet }: { source: "v1" | "v2"; networkLabel?: string; isTestnet?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium flex items-center gap-2">
          <span>{source === "v2" ? "Signed runs" : "Legacy v1 runs"}</span>
          {networkLabel && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded normal-case tracking-normal text-[10px] font-medium border border-[#1c2538] bg-[#0f1623] text-[#aab2c5]">
              <span className={`inline-block h-1 w-1 rounded-full ${isTestnet ? "bg-[#fbbf24]" : "bg-[#10b981]"}`} />
              {networkLabel}
              {isTestnet && <span className="text-[#fbbf24]">testnet</span>}
            </span>
          )}
        </div>
        <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[#e6e9f0]">Leaderboard</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-xl leading-[1.6]">
          {source === "v2"
            ? `Ranked by Sortino ratio. Every entry is signed by the agent's INFT-authorized wallet and recorded on ${networkLabel ?? "0G"}. Switch networks via the wallet dropdown in the header.`
            : "Pre-v2 runs under the placeholder AgentRegistry. Kept for historical reference only."}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 bg-[#0f1623] border border-[#1c2538] rounded-lg p-1">
        <Link
          href="/leaderboard"
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            source === "v2" ? "bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee44]" : "text-[#6b7691] hover:text-[#aab2c5]"
          }`}
        >
          Active
        </Link>
        <Link
          href="/leaderboard?source=v1"
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            source === "v1" ? "bg-[#22d3ee15] text-[#22d3ee] border border-[#22d3ee44]" : "text-[#6b7691] hover:text-[#aab2c5]"
          }`}
        >
          Archive
        </Link>
      </div>
    </div>
  );
}

function StatsStrip({ totalRuns, totalAgents, totalScenarios, lastRunAgo }: {
  totalRuns: number; totalAgents: number; totalScenarios: number; lastRunAgo: number | null;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl grid grid-cols-4 divide-x divide-[#1c2538] card-elevated">
      <Stat label="Runs" value={totalRuns.toString()} />
      <Stat label="Agents" value={totalAgents.toString()} />
      <Stat label="Scenarios" value={totalScenarios.toString()} />
      <Stat label="Last run" value={lastRunAgo !== null ? formatAgo(lastRunAgo) : "—"} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-0.5 font-medium">{label}</div>
      <div className="text-[16px] text-[#e6e9f0]">{value}</div>
    </div>
  );
}
function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
function EmptyState({ networkLabel }: { networkLabel?: string }) {
  return (
    <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center">
      <p className="text-[#aab2c5] mb-2">
        No runs published yet{networkLabel ? ` on ${networkLabel}` : ""}.
      </p>
      <p className="text-[12px] text-[#6b7691]">
        Run an agent via the MCP server with <code className="font-mono text-[#22d3ee] bg-[#22d3ee0a] px-1.5 py-0.5 rounded">start_run</code> to appear here.
        {networkLabel && " Try switching networks from the wallet dropdown if you expected runs from another chain."}
      </p>
    </div>
  );
}
