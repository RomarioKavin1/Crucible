import type { ScenarioDetail } from "@/lib/scenarios";

function shortHash(h: string, head = 8, tail = 6): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}

export function MethodologyTab({ scenario }: { scenario: ScenarioDetail }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1c2538]">
        <span className="text-[12px] font-medium text-[#e6e9f0]">Methodology</span>
      </div>
      <dl className="divide-y divide-[#1c2538]">
        <Row label="Bundle content hash" value={shortHash(scenario.contentHash, 10, 8)} mono />
        <Row label="Visibility" value="Public" />
        {scenario.dataSource && (
          <>
            <Row label="Price data provider" value={scenario.dataSource.provider} />
            <Row label="Symbol" value={scenario.dataSource.symbol} mono />
            <Row label="Granularity" value={scenario.dataSource.interval} mono />
            <Row label="Fetched at" value={new Date(scenario.dataSource.fetched_at).toLocaleString()} />
          </>
        )}
        {scenario.newsSource && <Row label="News source" value={scenario.newsSource} />}
        <Row label="Repo path" value={`scenarios/${scenario.id}/`} mono />
      </dl>
      <div className="px-5 py-4 border-t border-[#1c2538] text-[12px] text-[#6b7691] leading-relaxed">
        Bundles are deterministic. Re-run <code className="font-mono text-[#22d3ee]">pnpm run build:scenarios</code> from a
        clean clone to verify the content hash matches what is registered on-chain in <code className="font-mono text-[#22d3ee]">ScenarioRegistry</code>.
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</span>
      <span className={`text-[12px] text-[#e6e9f0] ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
