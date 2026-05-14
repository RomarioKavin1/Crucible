import type { TraceEntry, Tick } from "@crucible/core";

export interface EquityCurveProps {
  entries: TraceEntry[];
  ticks: Tick[];
  initialEquity?: number;
  width?: number;
  height?: number;
  /** If set, only draw the curve up to this tick index (inclusive) — used for playback. */
  currentTickIndex?: number;
}

/**
 * Equity over the run's ticks. Filled area below the curve so it reads as
 * "drawdown from start" rather than just a line.
 */
export function EquityCurve({ entries, ticks, initialEquity = 10000, width = 360, height = 80, currentTickIndex }: EquityCurveProps) {
  if (entries.length === 0 || ticks.length === 0) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[10px] text-[#5e6b80]"
        style={{ width, height }}
      >
        no data
      </div>
    );
  }

  const visible = currentTickIndex !== undefined
    ? entries.filter((e) => e.tick <= currentTickIndex)
    : entries;
  const series = visible.map((e) => {
    const tick = ticks[e.tick];
    const price = tick?.last ?? 1;
    return e.portfolio.cash + e.portfolio.position * price;
  });
  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[10px] text-[#5e6b80]"
        style={{ width, height }}
      >
        no data
      </div>
    );
  }
  const allValues = [initialEquity, ...series];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const stepX = series.length > 1 ? width / (series.length - 1) : 0;

  const lastValue = series[series.length - 1] ?? initialEquity;
  const isUp = lastValue >= initialEquity;
  const stroke = isUp ? "#10b981" : "#ef4444";
  const fill = isUp ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

  const points = series.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });
  const baselineY = height - ((initialEquity - min) / range) * height;
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${(points[points.length - 1]?.[0] ?? 0).toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible block w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      {/* baseline (starting equity) */}
      <line
        x1={0}
        x2={width}
        y1={baselineY}
        y2={baselineY}
        stroke="#5e6b80"
        strokeWidth={0.5}
        strokeDasharray="2 3"
      />
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
