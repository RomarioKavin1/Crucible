import { DifficultyStars } from "./DifficultyStars";

export interface ScenarioHeroProps {
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  difficulty?: number;
  durationTicks: number;
  tickIntervalMs: number;
  recordedDateLabel?: string;
  tags?: string[];
}

function tickIntervalLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms / tick`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s / tick`;
  return `${Math.round(ms / 60_000)}m / tick`;
}

export function ScenarioHero(props: ScenarioHeroProps) {
  const kindLabel = props.kind === "historical" ? "Historical" : "Synthetic";
  const kindColor = props.kind === "historical"
    ? "text-[#22d3ee] border-[#22d3ee44] bg-[#22d3ee0a]"
    : "text-[#fbbf24] border-[#fbbf2444] bg-[#fbbf240a]";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">{props.title}</h1>
        <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-1 border rounded ${kindColor}`}>{kindLabel}</span>
        <span className="text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-1 border border-[#1c2538] bg-[#131b2c] rounded text-[#aab2c5]">{props.asset}</span>
        {props.difficulty !== undefined && <DifficultyStars level={props.difficulty} />}
      </div>
      <div className="text-[13px] text-[#aab2c5] flex items-center gap-2 flex-wrap">
        {props.recordedDateLabel ? (
          <>
            <span>{props.recordedDateLabel}</span>
            <span className="text-[#3a4456]">·</span>
          </>
        ) : null}
        <span><span className="font-mono text-[#e6e9f0]">{props.durationTicks}</span> ticks</span>
        <span className="text-[#3a4456]">·</span>
        <span className="font-mono">{tickIntervalLabel(props.tickIntervalMs)}</span>
        {props.tags && props.tags.length > 0 && (
          <>
            <span className="text-[#3a4456]">·</span>
            <div className="flex gap-1.5 flex-wrap">
              {props.tags.map((tag) => (
                <span key={tag} className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 bg-[#131b2c] border border-[#1c2538] rounded text-[#6b7691]">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
