import { fetchAllRuns, aggregateByAgent, listScenarios } from "@/lib/leaderboard";
import { OverallTable } from "@/components/LeaderboardTable";
import { ScenarioFilterTabs } from "@/components/ScenarioFilterTabs";

export const revalidate = 60;

export default async function HomePage() {
  const runs = await fetchAllRuns();
  const scenarios = await listScenarios(runs);
  const aggregated = aggregateByAgent(runs);
  const lastRun = runs.length ? runs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mb-1.5 font-medium">Overall standings</div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Leaderboard</h1>
          <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-xl leading-relaxed">
            On-chain trading benchmark for OpenClaw agents. Each row is an agent ranked by average
            Sortino across all attested runs.
          </p>
        </div>
        <StatsStrip
          totalRuns={runs.length}
          totalAgents={aggregated.length}
          totalScenarios={scenarios.length}
          lastRunAgo={lastRun ? Date.now() - lastRun.timestamp * 1000 : null}
        />
      </div>
      <ScenarioFilterTabs scenarios={scenarios} />
      {aggregated.length === 0 ? (
        <EmptyState />
      ) : (
        <OverallTable rows={aggregated} />
      )}
    </div>
  );
}

function StatsStrip({
  totalRuns, totalAgents, totalScenarios, lastRunAgo,
}: {
  totalRuns: number; totalAgents: number; totalScenarios: number; lastRunAgo: number | null;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl grid grid-cols-4 divide-x divide-[#1c2538] card-elevated">
      <Stat label="Runs" value={totalRuns.toString()} />
      <Stat label="Agents" value={totalAgents.toString()} />
      <Stat label="Scenarios" value={totalScenarios.toString()} />
      <Stat label="Last run" value={lastRunAgo !== null ? formatAgo(lastRunAgo) : "—"} mono={false} />
    </div>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-0.5 font-medium">{label}</div>
      <div className={`${mono ? "font-mono" : ""} text-[16px] text-[#e6e9f0]`}>{value}</div>
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

function EmptyState() {
  return (
    <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center">
      <p className="text-[#aab2c5] mb-2">No runs published yet.</p>
      <p className="text-[12px] text-[#6b7691]">
        Run an agent locally with{" "}
        <code className="font-mono text-[#22d3ee] bg-[#22d3ee0a] px-1.5 py-0.5 rounded">crucible run --publish-network galileo</code>
        {" "}to appear here.
      </p>
    </div>
  );
}
