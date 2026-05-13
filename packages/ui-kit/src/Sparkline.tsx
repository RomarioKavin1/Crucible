export interface SparklineProps {
  /** Numeric series. Will be normalized to fit. Empty/single-value renders a flat line. */
  values: number[];
  width?: number;
  height?: number;
  /** Defaults to cyan. */
  color?: string;
}

export function Sparkline({ values, width = 60, height = 16, color = "#22d3ee" }: SparklineProps) {
  if (values.length === 0) {
    return <svg width={width} height={height} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
}
