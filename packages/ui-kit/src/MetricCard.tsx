export interface MetricCardProps {
  label: string;
  value: string;
  /** Direction glyph: "up" shows ▲ green, "down" shows ▼ red, "flat" shows nothing. */
  direction?: "up" | "down" | "flat";
  /** 0..1 — fills the bottom progress bar (e.g. relative to leaderboard avg). */
  progress?: number;
  /** Optional accent override. Default: derived from `direction`. */
  accent?: "cyan" | "amber" | "up" | "down" | "neutral";
}

const COLOR: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  cyan: "#22d3ee",
  amber: "#fbbf24",
  up: "#10b981",
  down: "#ef4444",
  neutral: "#e5e9f0",
};

export function MetricCard({ label, value, direction = "flat", progress, accent }: MetricCardProps) {
  const accentColor =
    accent ??
    (direction === "up" ? "up" : direction === "down" ? "down" : "neutral");
  const color = COLOR[accentColor];
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "";
  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-4 relative overflow-hidden">
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#5e6b80] mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl tabular-nums" style={{ color }}>{value}</span>
        {arrow && <span className="text-sm" style={{ color }}>{arrow}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-0.5 bg-[#1f2a3d] rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}
