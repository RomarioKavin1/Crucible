export interface ScenarioPreviewChartProps {
  points: number[];           // price values already downsampled
  height?: number;
  className?: string;
  /** Optional dot markers (e.g. news events). Indexes into `points`. */
  newsIndexes?: number[];
  /** Force direction colour; defaults to inferred from first vs last point. */
  direction?: "up" | "down";
}

export function ScenarioPreviewChart({
  points, height = 96, className = "", newsIndexes = [], direction,
}: ScenarioPreviewChartProps) {
  if (points.length < 2) {
    return <div className={`w-full ${className}`} style={{ height }} />;
  }
  const width = 600; // viewBox width — scales with preserveAspectRatio
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const norm = points.map((v, i) => [i * stepX, height - ((v - min) / range) * height] as const);
  const linePath = norm.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${(norm[norm.length - 1]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;

  const dir = direction ?? ((points[points.length - 1]! >= points[0]!) ? "up" : "down");
  const stroke = dir === "up" ? "#10b981" : "#ef4444";
  const fill = dir === "up" ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)";

  return (
    <svg
      className={`block w-full ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} />
      {newsIndexes.map((i, k) => {
        const pt = norm[i];
        if (!pt) return null;
        return (
          <circle key={k} cx={pt[0]} cy={pt[1]} r={3.5} fill="#fbbf24" stroke="#0a0e17" strokeWidth={1} />
        );
      })}
    </svg>
  );
}
