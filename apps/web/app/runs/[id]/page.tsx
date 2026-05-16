import { getRunRegistry, CHAIN_CONFIG } from "@/lib/chain";
import { fmtSortino, fmtPct, fmtAddr, fromE6 } from "@/lib/format";
import { ReplayClient } from "@/components/ReplayClient";
import { V2RunReplay } from "@/components/V2RunReplay";
import { RunMetaCard } from "@/components/RunMetaCard";
import { AGENT_INFT_ADDRESS } from "@/lib/contracts";
import { fetchRunV3ForNetwork } from "@/lib/leaderboard";
import { ethers } from "ethers";
import Link from "next/link";
import { cookies } from "next/headers";
import { decodeScenarioHash } from "@/lib/scenarios";
import { NETWORK_COOKIE, networkMeta, storageDownload, storageDownloadFor, explorerAddress, explorerAddressFor, type Network } from "@/lib/network";
import deployedAddresses from "../../../../../contracts/deployed-addresses.json";

export const dynamic = "force-dynamic";

interface CommonRun {
  source: "v1" | "v2";
  runId: string;
  agentLabel: string;
  agentDescription?: string;
  tokenId?: string;
  agentLink: string;
  scenarioId: string;
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

async function loadV2(runIdNum: bigint, network: Network): Promise<CommonRun | null> {
  const r = await fetchRunV3ForNetwork(runIdNum, network);
  if (!r) return null;
  const agentLabel = r.agentDescription
    ? `Agent #${r.tokenId} — ${r.agentDescription}`
    : `Agent #${r.tokenId}`;
  const decodedScenario = await decodeScenarioHash(r.scenarioId).catch(() => null);
  const v2Key = network === "mainnet" ? "mainnetV2" : "galileoV2";
  const v2 = (deployedAddresses as Record<string, Record<string, string>>)[v2Key] ?? {};
  return {
    source: "v2",
    runId: runIdNum.toString(),
    agentLabel,
    agentDescription: r.agentDescription || undefined,
    tokenId: r.tokenId.toString(),
    agentLink: `/agents/${r.tokenId}`,
    scenarioId: decodedScenario ?? r.scenarioId,
    scenarioLink: decodedScenario ? `/scenarios/${decodedScenario}` : undefined,
    traceHash: r.traceRoot,
    sortino: r.sortino,
    totalReturn: r.totalReturn,
    maxDrawdown: r.maxDrawdown,
    timestamp: r.timestamp,
    recordedBy: r.recordedBy,
    registryAddress: v2["RunRegistryV3"] as `0x${string}`,
  };
}

async function loadV1(runIdNum: bigint, cfg: typeof CHAIN_CONFIG): Promise<CommonRun | null> {
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
  searchParams?: { source?: string; network?: string };
}) {
  const cfg = CHAIN_CONFIG;
  const id = BigInt(params.id);
  const forceV1 = searchParams?.source === "v1";

  const requested = searchParams?.network ?? cookies().get(NETWORK_COOKIE)?.value;
  const network: Network = requested === "mainnet" ? "mainnet" : "galileo";
  const netMeta = networkMeta(network);

  let run = forceV1 ? await loadV1(id, cfg) : await loadV2(id, network);
  if (!run && !forceV1) run = await loadV1(id, cfg);

  if (!run) {
    return (
      <div className="max-w-container mx-auto px-5 md:px-8 pt-10 pb-20">
        <Link href="/leaderboard" className="editorial-link text-[13px]">← Back to leaderboard</Link>
        <div className="mt-16 text-center text-ink-3 text-[14px]">Run #{params.id} not found in v2 or v1 registry.</div>
      </div>
    );
  }

  return (
    <div className="max-w-container mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-20">
      <Link
        href="/leaderboard"
        className="text-[12.5px] text-ink-3 hover:text-accent transition-colors duration-fast ease-out-quart inline-flex items-center gap-1.5"
      >
        <span aria-hidden>←</span> All runs
      </Link>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <header className="mt-8 mb-12 md:mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6">
          <div className="lg:col-span-8">
            <div className="text-eyebrow flex items-center gap-2.5 mb-5">
              {run.source === "v2" ? (
                <>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-up" aria-hidden />
                  <span className="!text-up">Signed</span>
                </>
              ) : (
                <>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-ink-4" aria-hidden />
                  Legacy
                </>
              )}
              <span className="text-ink-4">·</span>
              <span className="font-mono normal-case tracking-normal">{netMeta.label}</span>
              <span className="text-ink-4">·</span>
              <span className="font-mono normal-case tracking-normal">run #{run.runId}</span>
            </div>

            <h1 className="text-h1 text-ink">
              {run.scenarioLink ? (
                <Link href={run.scenarioLink} className="hover:text-accent transition-colors duration-fast ease-out-quart">
                  {run.scenarioId}
                </Link>
              ) : (
                <span className="font-mono text-h2">
                  {run.scenarioId.startsWith("0x") ? `${run.scenarioId.slice(0, 14)}…` : run.scenarioId}
                </span>
              )}
            </h1>

            <p className="mt-5 text-lead text-ink-2 font-light">
              {run.agentDescription ? (
                <>
                  <Link href={run.agentLink} className="text-ink hover:text-accent transition-colors duration-fast ease-out-quart">
                    {run.agentDescription}
                  </Link>
                  <span className="text-ink-3"> · </span>
                </>
              ) : null}
              <Link href={run.agentLink} className="text-ink-2 hover:text-accent transition-colors duration-fast ease-out-quart font-mono text-[15px]">
                {run.source === "v2" ? `INFT #${run.tokenId}` : run.agentLabel}
              </Link>
              <span className="text-ink-3"> · recorded by </span>
              <code className="font-mono text-ink-2 text-[14px]">{fmtAddr(run.recordedBy)}</code>
            </p>

            {run.source === "v2" && (
              <Link
                href={`/verify/${run.runId}`}
                className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium bg-accent hover:bg-accent-hover text-bg px-5 h-10 rounded transition-colors duration-fast ease-out-quart"
              >
                Verify this run <span aria-hidden>↗</span>
              </Link>
            )}
          </div>

          {/* Score column — vertical, editorial typography */}
          <aside className="lg:col-span-4 lg:pt-1 grid grid-cols-3 lg:grid-cols-1 gap-y-6">
            <ScoreRow
              label="Sortino"
              value={fmtSortino(run.sortino)}
              accent={run.sortino >= 0 ? "up" : "down"}
              primary
            />
            <ScoreRow
              label="Return"
              value={fmtPct(run.totalReturn)}
              accent={run.totalReturn >= 0 ? "up" : "down"}
            />
            <ScoreRow
              label="Max drawdown"
              value={`−${fmtPct(Math.abs(run.maxDrawdown))}`}
              accent="down"
            />
          </aside>
        </div>
      </header>

      {/* ─── BODY ─────────────────────────────────────────────────── */}
      <div className="space-y-8">
        {run.source === "v2" && <RunMetaCard traceRoot={run.traceHash} network={network} />}
        {run.source === "v1" && run.scenarioLink && <ReplayClient traceHash={run.traceHash} scenarioId={run.scenarioId} />}
        {run.source === "v2" && <V2RunReplay traceRoot={run.traceHash} network={network} />}
      </div>

      {/* ─── COLOPHON / on-chain proof ─────────────────────────────── */}
      <section className="mt-16 pt-10 border-t border-border-subtle">
        <div className="text-eyebrow mb-6">On-chain colophon</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
          <ProofRow
            label="Run record"
            value={`runId #${run.runId}`}
            sub={run.source === "v2" ? `RunRegistryV3 · ${netMeta.label}` : `RunRegistry · ${netMeta.label}`}
            link={run.source === "v2" ? explorerAddressFor(run.registryAddress, network) : explorerAddress(run.registryAddress)}
            linkLabel="Contract"
          />
          <ProofRow
            label="Trace blob"
            value={shortHash(run.traceHash, 10, 6)}
            sub="0G Storage · content-addressed"
            link={run.source === "v2" ? storageDownloadFor(run.traceHash, network) : storageDownload(run.traceHash)}
            linkLabel="Download"
          />
          <ProofRow
            label={run.source === "v2" ? "INFT contract" : "Recipe hash"}
            value={run.source === "v2" ? shortHash(AGENT_INFT_ADDRESS, 10, 6) : shortHash(run.recipeHash ?? "", 10, 6)}
            sub={run.source === "v2" ? "AgentINFT · ERC-7857" : "committed in AgentRegistry"}
            link={run.source === "v2"
              ? explorerAddressFor(((deployedAddresses as any)[network === "mainnet" ? "mainnetV2" : "galileoV2"]?.AgentINFT ?? AGENT_INFT_ADDRESS) as string, network)
              : explorerAddress(cfg.contracts.AgentRegistry)}
            linkLabel="Contract"
          />
        </div>
      </section>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  accent,
  primary,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
  primary?: boolean;
}) {
  const colorCls = accent === "up" ? "text-up" : accent === "down" ? "text-down" : "text-ink";
  return (
    <div>
      <div className="text-eyebrow mb-2">{label}</div>
      <div
        className={`font-mono tabular-nums tracking-tight leading-none ${colorCls} ${
          primary ? "text-[40px] md:text-[48px]" : "text-[24px]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ProofRow({
  label,
  value,
  sub,
  link,
  linkLabel,
}: {
  label: string;
  value: string;
  sub: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <div>
      <div className="text-eyebrow mb-2">{label}</div>
      <div className="font-mono text-[14px] text-ink truncate mb-1">{value}</div>
      <div className="text-[12px] text-ink-3 mb-2">{sub}</div>
      <a
        href={link}
        target={link.startsWith("http") ? "_blank" : undefined}
        rel={link.startsWith("http") ? "noopener noreferrer" : undefined}
        className="editorial-link text-[12.5px] font-medium"
      >
        {linkLabel} →
      </a>
    </div>
  );
}

function shortHash(h: string, head = 6, tail = 4): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}
