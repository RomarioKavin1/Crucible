import { getRunRegistry } from "@/lib/chain";
import { loadChainConfig, type Network } from "@crucible/og-client";
import { fmtSortino, fmtPct, fmtAddr, fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { V2RunReplay } from "@/components/V2RunReplay";
import { publicClient, RUN_REGISTRY_V2_ADDRESS, AGENT_INFT_ADDRESS, ABIs, readIntelligentData } from "@/lib/contracts";
import { ethers } from "ethers";
import Link from "next/link";
import { decodeScenarioHash } from "@/lib/scenarios";

export const revalidate = 30;

const NETWORK: Network = (process.env["NEXT_PUBLIC_OG_NETWORK"] as Network) ?? "galileo";
const EXPLORER = NETWORK === "mainnet" ? "https://chainscan.0g.ai" : "https://chainscan-galileo.0g.ai";

interface CommonRun {
  source: "v1" | "v2";
  runId: string;
  agentLabel: string;
  agentLink: string;
  scenarioId: string;       // string (decoded for v1, hex for v2)
  scenarioLink?: string;
  recipeHash?: string;
  traceHash: string;
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  recordedBy: string;
  registryAddress: string;
}

async function loadV2(runIdNum: bigint): Promise<CommonRun | null> {
  const total = await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI, functionName: "totalRuns",
  }) as bigint;
  if (runIdNum > total || runIdNum === 0n) return null;
  const r = await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI, functionName: "getRun", args: [runIdNum],
  }) as any;
  let agentLabel = `Agent #${r.tokenId.toString()}`;
  try {
    const data = await readIntelligentData(r.tokenId);
    if (data.description) agentLabel = `Agent #${r.tokenId.toString()} — ${data.description}`;
  } catch {}
  // Attempt to decode the bytes32 scenario hash back to a human-readable scenario id
  const decodedScenario = await decodeScenarioHash(r.scenarioId).catch(() => null);
  return {
    source: "v2",
    runId: runIdNum.toString(),
    agentLabel,
    agentLink: `/agents/${r.tokenId.toString()}`,
    scenarioId: decodedScenario ?? r.scenarioId,
    scenarioLink: decodedScenario ? `/scenarios/${decodedScenario}` : undefined,
    traceHash: r.traceRoot,
    sortino: Number(r.scoreSortinoE6) / 1e6,
    totalReturn: Number(r.totalReturnE6) / 1e6,
    maxDrawdown: Number(r.maxDrawdownE6) / 1e6,
    timestamp: Number(r.timestamp),
    recordedBy: r.recordedBy,
    registryAddress: RUN_REGISTRY_V2_ADDRESS,
  };
}

async function loadV1(runIdNum: bigint, cfg: Awaited<ReturnType<typeof loadChainConfig>>): Promise<CommonRun | null> {
  try {
    const reg = await getRunRegistry();
    const r = (await reg.getRun(runIdNum)) as {
      agentId: bigint; scenarioId: string; recipeHash: string; traceHash: string;
      scoreSortinoE6: bigint; totalReturnE6: bigint; maxDrawdownE6: bigint;
      timestamp: bigint; teeAttestation: string; recordedBy: string;
    };
    const scenarioId = ethers.decodeBytes32String(r.scenarioId);
    return {
      source: "v1",
      runId: runIdNum.toString(),
      agentLabel: `Agent #${r.agentId.toString()} (v1)`,
      agentLink: `/agents/${r.agentId.toString()}?source=v1`,
      scenarioId,
      scenarioLink: `/scenarios/${scenarioId}`,
      recipeHash: r.recipeHash,
      traceHash: r.traceHash,
      sortino: fromE6(r.scoreSortinoE6),
      totalReturn: fromE6(r.totalReturnE6),
      maxDrawdown: fromE6(r.maxDrawdownE6),
      timestamp: Number(r.timestamp),
      recordedBy: r.recordedBy,
      registryAddress: cfg.contracts.RunRegistry,
    };
  } catch {
    return null;
  }
}

export default async function RunPage({ params, searchParams }: {
  params: { id: string };
  searchParams?: { source?: string };
}) {
  const cfg = await loadChainConfig(NETWORK);
  const id = BigInt(params.id);
  const forceV1 = searchParams?.source === "v1";

  let run = forceV1 ? await loadV1(id, cfg) : await loadV2(id);
  if (!run && !forceV1) run = await loadV1(id, cfg);  // fallback if v2 didn't have it

  if (!run) {
    return (
      <div className="space-y-6">
        <Link href="/leaderboard" className="text-[12px] text-[#6b7691] hover:text-[#22d3ee]">← Back to leaderboard</Link>
        <div className="p-8 text-center text-[#6b7691]">Run #{params.id} not found in v2 or v1 registry.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/leaderboard" className="text-[12px] text-[#6b7691] hover:text-[#22d3ee] transition-colors inline-flex items-center gap-1.5">
        <span aria-hidden>←</span> Back to leaderboard
      </Link>

      {/* HERO CARD */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="px-7 py-6 flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[#22d3ee] text-2xl leading-none">◆</span>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0] leading-none">
                Run #{run.runId}
              </h1>
              <span className={`ml-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.1em] ${
                run.source === "v2"
                  ? "bg-[#10b98115] border border-[#10b98140] text-[#10b981]"
                  : "bg-[#6b769115] border border-[#6b769140] text-[#aab2c5]"
              }`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{
                  background: run.source === "v2" ? "#10b981" : "#aab2c5",
                  boxShadow: run.source === "v2" ? "0 0 8px #10b981" : "none",
                }} />
                {run.source === "v2" ? "Signed (v2)" : "Legacy (v1)"}
              </span>
            </div>
            <div className="text-[12px] text-[#6b7691] flex items-center gap-2 flex-wrap">
              {run.scenarioLink ? (
                <Link href={run.scenarioLink} className="text-[#22d3ee] hover:underline">{run.scenarioId}</Link>
              ) : (
                <span className="font-mono">
                  {run.scenarioId.startsWith("0x")
                    ? `${run.scenarioId.slice(0, 14)}…`
                    : run.scenarioId}
                </span>
              )}
              <span className="text-[#3a4456]">·</span>
              <Link href={run.agentLink} className="text-[#22d3ee] hover:underline">{run.agentLabel}</Link>
              <span className="text-[#3a4456]">·</span>
              <span>recorded by <code className="font-mono text-[#aab2c5]">{fmtAddr(run.recordedBy)}</code></span>
            </div>
          </div>
          {run.source === "v2" && (
            <div className="flex items-center gap-2">
              <Link
                href={`/verify/${run.runId}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                Verify run <span aria-hidden>↗</span>
              </Link>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-[#1c2538] divide-x divide-[#1c2538]">
          <HeroStat label="Sortino" value={fmtSortino(run.sortino)} accent={run.sortino >= 0 ? "up" : "down"} primary />
          <HeroStat label="Total return" value={fmtPct(run.totalReturn)} accent={run.totalReturn >= 0 ? "up" : "down"} />
          <HeroStat label="Max drawdown" value={fmtPct(Math.abs(run.maxDrawdown))} accent="down" />
          <HeroStat
            label="Recorded"
            value={new Date(run.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            sub={new Date(run.timestamp * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          />
        </div>
      </div>

      {run.source === "v1" && run.scenarioLink && <ReplayClient traceHash={run.traceHash} scenarioId={run.scenarioId} />}
      {run.source === "v2" && <V2RunReplay traceRoot={run.traceHash} />}

      {/* ON-CHAIN PROOF */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-3 border-b border-[#1c2538] flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#e6e9f0]">On-chain proof</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691]">{NETWORK} · {run.source}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1c2538]">
          <ProofCell
            label="Run record"
            value={`runId ${run.runId}`}
            sub={run.source === "v2" ? "RunRegistryV2" : "RunRegistry"}
            link={`${EXPLORER}/address/${run.registryAddress}`}
            linkLabel="View contract"
          />
          <ProofCell
            label="Trace blob"
            value={shortHash(run.traceHash, 10, 6)}
            sub="0G Storage root"
            link={`https://indexer-storage-testnet-turbo.0g.ai/file?root=${run.traceHash}`}
            linkLabel="Download"
          />
          <ProofCell
            label={run.source === "v2" ? "INFT contract" : "Recipe hash"}
            value={run.source === "v2" ? shortHash(AGENT_INFT_ADDRESS, 10, 6) : shortHash(run.recipeHash ?? "", 10, 6)}
            sub={run.source === "v2" ? "AgentINFT (ERC-7857)" : "committed in AgentRegistry"}
            link={`${EXPLORER}/address/${run.source === "v2" ? AGENT_INFT_ADDRESS : (cfg.contracts.AgentRegistry)}`}
            linkLabel="View contract"
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label, value, sub, accent, primary,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down";
  primary?: boolean;
}) {
  const color = accent === "up" ? "#10b981" : accent === "down" ? "#ef4444" : "#e6e9f0";
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-1.5 font-medium">{label}</div>
      <div className={`flex items-baseline gap-1.5 font-mono ${primary ? "text-[26px]" : "text-[20px]"}`} style={{ color }}>
        {accent === "down" && <span className="text-[12px]">▼</span>}
        {accent === "up" && <span className="text-[12px]">▲</span>}
        <span>{value}</span>
      </div>
      {sub && <div className="text-[11px] text-[#6b7691] mt-1">{sub}</div>}
    </div>
  );
}

function ProofCell({
  label, value, sub, link, linkLabel,
}: { label: string; value: string; sub: string; link: string; linkLabel: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-1.5 font-medium">{label}</div>
      <div className="font-mono text-[14px] text-[#e6e9f0] truncate">{value}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#6b7691]">{sub}</span>
        <a
          href={link}
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-[11px] text-[#22d3ee] hover:underline inline-flex items-center gap-1"
        >
          {linkLabel} <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  );
}

function shortHash(h: string, head = 6, tail = 4): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}
