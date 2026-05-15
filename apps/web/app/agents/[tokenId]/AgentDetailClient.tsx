"use client";
import Link from "next/link";
import useSWR from "swr";
import { readIntelligentData, readRunsByToken, readRun, readOwnerOf } from "@/lib/contracts";
import { ConnectAgentWizard } from "@/components/ConnectAgentWizard";
import { useActiveSession } from "@/lib/useActiveSessions";
import { LiveRunBanner } from "@/components/LiveRunBanner";

async function loadDetail(tokenId: bigint) {
  const [data, owner, runIds] = await Promise.all([
    readIntelligentData(tokenId),
    readOwnerOf(tokenId),
    readRunsByToken(tokenId),
  ]);
  const runs = await Promise.all(runIds.map(async (id) => ({ id, run: await readRun(id) })));
  return { description: data.description, owner, runs };
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function AgentDetailClient({ tokenId }: { tokenId: bigint }) {
  const { data, error, isLoading } = useSWR(["agent", tokenId.toString()], () => loadDetail(tokenId));
  const liveSession = useActiveSession(tokenId);

  if (isLoading) {
    return (
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[12.5px] text-[#6b7691] card-elevated">
        Loading agent…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef444466] rounded-2xl p-6 text-[#ef4444] text-[13px]">
        Couldn&rsquo;t load this agent: {String(error)}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      {liveSession && <LiveRunBanner session={liveSession} />}

      {/* Header */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <Link href="/my-agents" className="text-[11px] text-[#6b7691] hover:text-[#aab2c5] transition-colors">
            ← Your agents
          </Link>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mt-2 font-mono">
            Agent #{tokenId.toString()}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0] mt-1 leading-tight">
            {data.description || <span className="text-[#6b7691] italic font-normal">Unnamed agent</span>}
          </h1>
          <div className="text-[11.5px] text-[#6b7691] mt-2 font-mono">
            Owned by{" "}
            <a
              href={`https://chainscan-galileo.0g.ai/address/${data.owner}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[#aab2c5] hover:text-[#22d3ee] transition-colors"
            >
              {shortAddr(data.owner)}
            </a>
          </div>
        </div>
        <Link
          href={`/agents/${tokenId}/start`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors shadow-sm shrink-0"
        >
          Start a benchmark →
        </Link>
      </header>

      {/* Connect wizard */}
      <ConnectAgentWizard tokenId={tokenId} />

      {/* Run history */}
      <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
        <header className="px-5 py-4 border-b border-[#1c2538] flex items-baseline justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Run history</h2>
            <p className="text-[11.5px] text-[#aab2c5] mt-0.5">
              Every benchmark this agent has published, on-chain
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#6b7691]">{data.runs.length} total</span>
        </header>
        {data.runs.length === 0 ? (
          <div className="p-8 text-center text-[12.5px] text-[#6b7691]">
            No runs yet. Use the wizard above to connect, then start your first benchmark.
          </div>
        ) : (
          <ul className="divide-y divide-[#1c2538]">
            {data.runs.map(({ id, run }) => {
              const sortino = Number(run.scoreSortinoE6) / 1e6;
              const ret = Number(run.totalReturnE6) / 1e6;
              const retColor = ret >= 0 ? "#10b981" : "#ef4444";
              return (
                <li key={id.toString()}>
                  <Link
                    href={`/runs/${id.toString()}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-[#ffffff03] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono text-[11.5px] text-[#6b7691] shrink-0">
                        Run #{id.toString()}
                      </span>
                      <span className="text-[12px] text-[#aab2c5]">
                        Sortino <span className="font-mono text-[#e6e9f0]">{sortino.toFixed(3)}</span>
                      </span>
                      <span className="text-[12px] font-mono tabular-nums" style={{ color: retColor }}>
                        {ret >= 0 ? "▲" : "▼"} {Math.abs(ret).toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-[#22d3ee] shrink-0">View →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
