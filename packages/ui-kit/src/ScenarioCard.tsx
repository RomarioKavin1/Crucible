import Link from "next/link";
import { ScenarioPreviewChart } from "./ScenarioPreviewChart";

export interface ScenarioCardData {
  id: string;
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  durationTicks: number;
  tickIntervalMs: number;
  previewPoints: number[];
  netMovePct?: number;          // last vs first as fraction
  bestSortino?: number | null;
  trials?: number;
  recordedDateLabel?: string;   // e.g. "Jan 11, 2024" for historical; "Synthetic" otherwise
}

export interface ScenarioCardProps {
  data: ScenarioCardData;
}

function tickIntervalLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms/tick`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s/tick`;
  return `${Math.round(ms / 60_000)}m/tick`;
}

function fmtPct(p: number | undefined): string {
  if (p === undefined) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(1)}%`;
}

export function ScenarioCard({ data }: ScenarioCardProps) {
  const kindLabel = data.kind === "historical" ? "Historical" : "Synthetic";
  const kindColor = data.kind === "historical" ? "text-[#22d3ee] border-[#22d3ee44] bg-[#22d3ee0a]" : "text-[#fbbf24] border-[#fbbf2444] bg-[#fbbf240a]";
  const netDirection: "up" | "down" | undefined = data.netMovePct === undefined ? undefined : data.netMovePct >= 0 ? "up" : "down";
  const moveColor = data.netMovePct === undefined ? "#aab2c5" : data.netMovePct >= 0 ? "#10b981" : "#ef4444";
  return (
    <Link
      href={`/scenarios/${data.id}`}
      className="group block bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated hover:border-[#22d3ee44] transition-colors"
    >
      <div className="relative bg-[#0a0e17]">
        <ScenarioPreviewChart points={data.previewPoints} height={120} direction={netDirection} />
        <span className="absolute top-2 right-3 text-[10px] font-mono text-[#aab2c5] bg-[#0a0e17cc] backdrop-blur px-1.5 py-0.5 rounded">
          {data.asset}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[14px] font-medium text-[#e6e9f0] leading-snug">{data.title}</span>
          <span className={`shrink-0 text-[10px] uppercase tracking-[0.1em] font-medium px-1.5 py-0.5 border rounded ${kindColor}`}>
            {kindLabel}
          </span>
        </div>
        <div className="text-[11px] text-[#6b7691]">
          {data.recordedDateLabel ? <>{data.recordedDateLabel} · </> : null}
          <span className="font-mono text-[#aab2c5]">{data.durationTicks}</span> ticks · {tickIntervalLabel(data.tickIntervalMs)}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Best Sortino" value={data.bestSortino !== null && data.bestSortino !== undefined ? data.bestSortino.toFixed(2) : "—"} />
          <Stat label="Trials" value={data.trials !== undefined ? data.trials.toString() : "—"} />
          <Stat label="Net move" value={fmtPct(data.netMovePct)} color={moveColor} />
        </div>
        <div className="text-[11px] text-[#22d3ee] group-hover:text-[#67e8f9] transition-colors pt-1">
          View scenario →
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</div>
      <div className="font-mono text-[12px] tabular-nums" style={{ color: color ?? "#e6e9f0" }}>{value}</div>
    </div>
  );
}
