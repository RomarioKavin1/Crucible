import { fetchAllRunsV3 } from "@/lib/leaderboard";
import { listScenarios } from "@/lib/scenarios";
import { CURRENT_NETWORK } from "@/lib/network";
import deployedAddresses from "../../../contracts/deployed-addresses.json";

/**
 * Editorial proof band — "show, then explain." Four typographic facts about
 * what is actually live on chain right now. Numbers come from a live read of
 * RunRegistryV3 and the scenarios manifest, not seed data.
 *
 * The right column carries the real contract address (mono, clickable to
 * explorer). Practice-what-you-preach: the page that argues against
 * self-reporting cannot self-report.
 */
export async function ProofBand() {
  const [runs, scenarios] = await Promise.all([
    fetchAllRunsV3().catch(() => []),
    listScenarios(),
  ]);

  const uniqueAgents = new Set(runs.map((r) => r.tokenId)).size;

  // Pick the right contract slot based on current cookie-resolved network.
  const all = deployedAddresses as Record<string, Record<string, string>>;
  const slot = CURRENT_NETWORK.id === "mainnet" ? "mainnetV2" : "galileoV2";
  const registry = all[slot]?.["RunRegistryV3"] ?? "0x…";
  const inft = all[slot]?.["AgentINFT"] ?? "0x…";

  return (
    <section className="border-t border-border-subtle">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
        <Fact label="Runs published" value={runs.length} mono />
        <Fact label="Unique agents" value={uniqueAgents} mono />
        <Fact label="Scenarios sealed" value={scenarios.length} mono />
        <FactLink
          label="RunRegistryV3"
          value={short(registry)}
          href={`${CURRENT_NETWORK.explorerBase}/address/${registry}`}
        />
      </div>

      {/* Sub-row — contracts colophon */}
      <div className="border-t border-border-subtle py-5 px-5 md:px-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-ink-3 font-mono">
        <span className="text-eyebrow !text-ink-4">Live on chain</span>
        <ContractLink label="AgentINFT" addr={inft} />
        <ContractLink label="RunRegistryV3" addr={registry} />
      </div>
    </section>
  );
}

function Fact({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="px-5 md:px-8 py-7 md:py-8">
      <div className="text-eyebrow">{label}</div>
      <div className={`mt-3 text-[40px] leading-none tracking-tight text-ink ${mono ? "font-mono tabular-nums" : "font-light"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function FactLink({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group px-5 md:px-8 py-7 md:py-8 hover:bg-surface-1/40 transition-colors duration-fast ease-out-quart block"
    >
      <div className="text-eyebrow flex items-center gap-1.5">
        {label} <span className="text-ink-4 normal-case tracking-normal">↗</span>
      </div>
      <div className="mt-3 text-[24px] leading-none tracking-tight font-mono text-ink group-hover:text-accent transition-colors duration-fast ease-out-quart">
        {value}
      </div>
    </a>
  );
}

function ContractLink({ label, addr }: { label: string; addr: string }) {
  return (
    <a
      href={`${CURRENT_NETWORK.explorerBase}/address/${addr}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-2 hover:text-accent transition-colors duration-fast ease-out-quart"
    >
      <span className="text-ink-4 font-sans">{label}</span>
      <span>{short(addr)}</span>
    </a>
  );
}

function short(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
