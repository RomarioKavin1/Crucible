import { fetchAllRuns } from "@/lib/leaderboard";
import { AgentCard } from "@/components/AgentCard";

export const revalidate = 60;

export default async function AgentPage({ params }: { params: { id: string } }) {
  const allRuns = await fetchAllRuns();
  const myRuns = allRuns.filter((r) => r.agentId === params.id);
  if (myRuns.length === 0) {
    return <p className="text-slate-400">No runs for agent #{params.id}.</p>;
  }
  const owner = myRuns[0]!.ownerAddr;
  const sorted = myRuns.sort((a, b) => b.timestamp - a.timestamp);
  const bestSortino = Math.max(...myRuns.map((r) => r.sortino));
  return (
    <AgentCard
      agentId={params.id}
      ownerAddr={owner}
      runCount={myRuns.length}
      bestSortino={bestSortino}
      recentRuns={sorted.slice(0, 10).map((r) => ({
        runId: r.runId,
        scenarioId: r.scenarioId,
        sortino: r.sortino,
        totalReturn: r.totalReturn,
      }))}
    />
  );
}
