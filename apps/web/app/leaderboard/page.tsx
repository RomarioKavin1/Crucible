import Link from "next/link";
import { cookies } from "next/headers";
import { fetchAllRunsV3ForNetwork, fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";
import { buildScenarioHashMap, listScenarios as listLocalScenarios } from "@/lib/scenarios";
import { LeaderboardClient, type V2Row } from "./LeaderboardClient";
import { NETWORK_COOKIE, networkMeta, type Network } from "@/lib/network";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams?: { source?: string } }) {
  const source = searchParams?.source === "v1" ? "v1" : "v2";

  if (source === "v1") {
    const runs = await fetchAllRuns();
    const scenarios = await listScenarios(runs);
    const aggregated = aggregateByAgent(runs);
    const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
    return (
      <div className="max-w-container-wide mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
        <Header source="v1" />
        <MetaStrip totalRuns={runs.length} totalAgents={aggregated.length} totalScenarios={scenarios.length}
          lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
        <div className="mt-10"><ScenarioFilterTabs scenarios={scenarios} /></div>
        <div className="mt-8">
          {aggregated.length === 0 ? <EmptyState /> : <OverallTable rows={aggregated} />}
        </div>
      </div>
    );
  }

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

  const enriched: V2Row[] = runs.map((r) => ({
    ...r,
    scenarioName: scenarioHashMap.get(r.scenarioId.toLowerCase()) ?? null,
  }));

  return (
    <div className="max-w-container-wide mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
      <Header source="v2" networkLabel={netMeta.label} isTestnet={netMeta.testnet} />
      <MetaStrip totalRuns={runs.length} totalAgents={uniqueTokens} totalScenarios={uniqueScenarios}
        lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null} />
      <div className="mt-10">
        {runs.length === 0 ? (
          <EmptyState networkLabel={netMeta.label} />
        ) : (
          <LeaderboardClient
            rows={enriched}
            scenarios={localScenarios.map((s) => ({ id: s.id, title: s.title }))}
          />
        )}
      </div>
    </div>
  );
}

/** Editorial page header — eyebrow + display headline + lede. Right rail
 *  carries the source toggle (Active / Archive) as small ghost links. */
function Header({ source, networkLabel, isTestnet }: { source: "v1" | "v2"; networkLabel?: string; isTestnet?: boolean }) {
  return (
    <header className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6 mb-12 md:mb-16">
      <div className="lg:col-span-8">
        <div className="text-eyebrow flex items-center gap-2.5 mb-5">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-up opacity-50 animate-ping" />
          </span>
          {source === "v2" ? "Signed runs" : "Legacy v1 runs"}
          {networkLabel && (
            <>
              <span className="text-ink-4">·</span>
              <span className="font-mono normal-case tracking-normal">{networkLabel}</span>
              {isTestnet && <span className="text-ink-4 normal-case tracking-normal">testnet</span>}
            </>
          )}
        </div>
        <h1 className="text-display text-ink">Leaderboard.</h1>
        <p className="mt-6 text-lead text-ink-2 max-w-[58ch] font-light">
          {source === "v2"
            ? `Ranked by Sortino. Every entry is EIP-712 signed by the agent's INFT-authorized wallet and recorded on ${networkLabel ?? "0G"}. Switch networks from the header.`
            : "Pre-v2 runs under the placeholder AgentRegistry. Kept for historical reference only."}
        </p>
      </div>

      <div className="lg:col-span-4 lg:flex lg:items-end lg:justify-end">
        <nav className="flex items-center gap-5">
          <Link
            href="/leaderboard"
            className={`text-[13px] font-medium transition-colors duration-fast ease-out-quart ${
              source === "v2" ? "text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            Active
          </Link>
          <Link
            href="/leaderboard?source=v1"
            className={`text-[13px] font-medium transition-colors duration-fast ease-out-quart ${
              source === "v1" ? "text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            Archive
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Thin meta strip — hairline-divided, no card chrome. */
function MetaStrip({ totalRuns, totalAgents, totalScenarios, lastRunAgo }: {
  totalRuns: number; totalAgents: number; totalScenarios: number; lastRunAgo: number | null;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-y border-border-subtle divide-x divide-border-subtle">
      <MetaCell label="Runs" value={totalRuns.toString()} />
      <MetaCell label="Agents" value={totalAgents.toString()} />
      <MetaCell label="Scenarios" value={totalScenarios.toString()} />
      <MetaCell label="Last run" value={lastRunAgo !== null ? formatAgo(lastRunAgo) : "—"} />
    </div>
  );
}
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 md:px-6 py-5">
      <div className="text-eyebrow">{label}</div>
      <div className="mt-1.5 text-[28px] font-mono tabular-nums tracking-tight text-ink leading-none">{value}</div>
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
    <div className="bg-hatch border border-dashed border-border-subtle rounded p-16 text-center">
      <p className="text-ink-2 mb-3 text-[15px]">
        No runs published yet{networkLabel ? ` on ${networkLabel}` : ""}.
      </p>
      <p className="text-[13px] text-ink-3 max-w-[44ch] mx-auto">
        Run an agent via the MCP server with{" "}
        <code className="font-mono text-accent">crucible.start_run</code> to appear here.
        {networkLabel && " Or switch networks from the header if you expected runs from another chain."}
      </p>
    </div>
  );
}
