"use client";
import Link from "next/link";
import useSWR from "swr";
import { useAccount } from "wagmi";
import { motion } from "motion/react";
import { readIntelligentData, readRunsByToken, readRun, readOwnerOf, readDelegations } from "@/lib/contracts";
import { ConnectAgentWizard } from "@/components/ConnectAgentWizard";
import { useActiveSession } from "@/lib/useActiveSessions";
import { LiveRunBanner } from "@/components/LiveRunBanner";
import { explorerAddress } from "@/lib/network";
import { PRESS_BUTTON } from "@/lib/motion";

async function loadDetail(tokenId: bigint) {
  const [data, owner, runIds, delegations] = await Promise.all([
    readIntelligentData(tokenId),
    readOwnerOf(tokenId),
    readRunsByToken(tokenId),
    readDelegations(tokenId),
  ]);
  const runs = await Promise.all(runIds.map(async (id) => ({ id, run: await readRun(id) })));
  // Sort newest first so the metric strip + history mirror the leaderboard order.
  runs.sort((a, b) => Number(b.run.timestamp) - Number(a.run.timestamp));
  return { description: data.description, owner, runs, delegations };
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function AgentDetailClient({ tokenId }: { tokenId: bigint }) {
  const { address: viewerAddress } = useAccount();
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

  const isOwner = Boolean(
    viewerAddress && data.owner.toLowerCase() === viewerAddress.toLowerCase(),
  );

  // Aggregate metrics from on-chain runs.
  const runs = data.runs;
  const sortinos = runs.map((r) => Number(r.run.scoreSortinoE6) / 1e6);
  const returns  = runs.map((r) => Number(r.run.totalReturnE6) / 1e6);
  const bestSortino = sortinos.length ? Math.max(...sortinos) : null;
  const avgSortino  = sortinos.length ? sortinos.reduce((a, b) => a + b, 0) / sortinos.length : null;
  const bestReturn  = returns.length ? Math.max(...returns) : null;

  return (
    <div className="space-y-6">
      {liveSession && <LiveRunBanner session={liveSession} />}

      {/* Header */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <Link href={isOwner ? "/my-agents" : "/leaderboard"} className="text-[11px] text-[#6b7691] hover:text-[#aab2c5] transition-colors">
            ← {isOwner ? "Your agents" : "Leaderboard"}
          </Link>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] mt-2 font-mono">
            Agent #{tokenId.toString()}
            {!isOwner && (
              <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal font-sans text-[10px] text-[#6b7691]">
                <span className="inline-block w-1 h-1 rounded-full bg-[#6b7691]" /> read-only
              </span>
            )}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0] mt-1 leading-tight">
            {data.description || <span className="text-[#6b7691] italic font-normal">Unnamed agent</span>}
          </h1>
          <div className="text-[11.5px] text-[#6b7691] mt-2 font-mono">
            Owned by{" "}
            <a
              href={explorerAddress(data.owner)}
              target="_blank" rel="noopener noreferrer"
              className="text-[#aab2c5] hover:text-[#22d3ee] transition-colors"
            >
              {shortAddr(data.owner)}
            </a>
            {isOwner && <span className="ml-2 text-[10px] text-[#10b981]">(you)</span>}
            {data.delegations.length > 0 && (
              <span className="ml-3">
                · {data.delegations.length} delegated key{data.delegations.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <motion.div {...PRESS_BUTTON}>
          <Link
            href={`/runbuilder?agent=${tokenId.toString()}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors shrink-0"
          >
            Run with this agent <span aria-hidden>→</span>
          </Link>
        </motion.div>
      </header>

      {/* Metric strip */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#1c2538]">
          <Metric label="Runs published"   value={runs.length.toString()} mono />
          <Metric label="Best Sortino"     value={bestSortino === null ? "—" : `${bestSortino >= 0 ? "+" : ""}${bestSortino.toFixed(2)}`} accent={bestSortino === null ? undefined : bestSortino >= 0 ? "up" : "down"} mono />
          <Metric label="Average Sortino"  value={avgSortino === null ? "—" : `${avgSortino >= 0 ? "+" : ""}${avgSortino.toFixed(2)}`} accent={avgSortino === null ? undefined : avgSortino >= 0 ? "up" : "down"} mono />
          <Metric label="Best return"      value={bestReturn === null ? "—" : `${bestReturn >= 0 ? "+" : ""}${(bestReturn * 100).toFixed(2)}%`} accent={bestReturn === null ? undefined : bestReturn >= 0 ? "up" : "down"} mono />
        </div>
      </div>

      {/* Run history */}
      <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
        <header className="px-5 py-4 border-b border-[#1c2538] flex items-baseline justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Run history</h2>
            <p className="text-[11.5px] text-[#aab2c5] mt-0.5">
              Every benchmark this agent has published, on-chain.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#6b7691]">{runs.length} total</span>
        </header>
        {runs.length === 0 ? (
          <div className="p-8 text-center text-[12.5px] text-[#6b7691]">
            No runs yet.
            {isOwner && (
              <>
                {" "}
                <Link href={`/runbuilder?agent=${tokenId.toString()}`} className="text-[#22d3ee] hover:underline">
                  Start your first benchmark →
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#1c2538]">
            {runs.map(({ id, run }) => {
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

      {/* Owner-only delegation management */}
      {isOwner ? (
        <ConnectAgentWizard tokenId={tokenId} />
      ) : (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-2">
            Delegated signers
          </div>
          {data.delegations.length === 0 ? (
            <div className="text-[12.5px] text-[#6b7691] italic">
              No delegated keys. Only the owner can sign benchmarks for this agent.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {data.delegations.map((addr) => (
                <li key={addr}>
                  <a
                    href={explorerAddress(addr)}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[11.5px] text-[#aab2c5] hover:text-[#22d3ee] transition-colors break-all"
                  >
                    {addr}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-[#6b7691] mt-3 leading-relaxed">
            Only the owner ({shortAddr(data.owner)}) can manage delegations.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  label, value, accent, mono,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
  mono?: boolean;
}) {
  const color = accent === "up" ? "#10b981" : accent === "down" ? "#ef4444" : "#e6e9f0";
  return (
    <div className="px-5 py-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-1">
        {label}
      </div>
      <div
        className={`text-[22px] font-semibold leading-none tabular-nums ${mono ? "font-mono" : ""}`}
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
