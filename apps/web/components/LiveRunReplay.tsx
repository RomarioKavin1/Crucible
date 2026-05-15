"use client";

interface Frame {
  type: string;
  payload?: any;
  ts?: number;
}

interface TickPoint {
  tickId: number;
  price: number;
  equity: number;
  cash: number;
  position: number;
  kind: string;
  reasoning: string;
}

function buildSeries(frames: Frame[]): TickPoint[] {
  const out: TickPoint[] = [];
  for (const f of frames) {
    if (f.type !== "tick") continue;
    const p = f.payload;
    const obs = p?.observation;
    if (!obs) continue;
    out.push({
      tickId: p.tickId,
      price: typeof obs.price === "number" ? obs.price : 0,
      equity: typeof obs.equity === "number" ? obs.equity : 0,
      cash: typeof obs.cash === "number" ? obs.cash : 0,
      position: typeof obs.position === "number" ? obs.position : 0,
      kind: p.action?.kind ?? "noop",
      reasoning: p.action?.reasoning ?? "",
    });
  }
  return out;
}

interface LineChartProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  label?: string;
  format?: (n: number) => string;
}

function LineChart({ values, width = 480, height = 140, color = "#3b82f6", fill, label, format }: LineChartProps) {
  if (values.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded">
        Waiting for data…
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 16) - 8;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = fill ? `${line} L ${width} ${height} L 0 ${height} Z` : "";
  const last = values[values.length - 1]!;
  const fmt = format ?? ((n: number) => n.toFixed(2));
  return (
    <div className="relative">
      {label && (
        <div className="absolute top-1 left-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
          {label} <span className="text-zinc-300 ml-2 tabular-nums">{fmt(last)}</span>
        </div>
      )}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {fill && <path d={area} fill={fill} />}
        <path d={line} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function LiveRunReplay({ frames }: { frames: Frame[] }) {
  const series = buildSeries(frames);
  const last = series[series.length - 1];
  const buys = series.filter((s) => s.kind === "market_buy").length;
  const sells = series.filter((s) => s.kind === "market_sell").length;
  const noops = series.filter((s) => s.kind === "noop").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart column */}
      <section className="lg:col-span-2 space-y-4">
        <div className="p-4 bg-[#0f1623] border border-[#1c2538] rounded-xl">
          <LineChart
            values={series.map((s) => s.price)}
            color="#fbbf24"
            fill="rgba(251,191,36,0.08)"
            label="PRICE"
            format={(n) => `$${n.toFixed(2)}`}
          />
        </div>
        <div className="p-4 bg-[#0f1623] border border-[#1c2538] rounded-xl">
          <LineChart
            values={series.map((s) => s.equity)}
            color="#22c55e"
            fill="rgba(34,197,94,0.08)"
            label="EQUITY"
            format={(n) => `$${n.toFixed(2)}`}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Tick</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-100">{last?.tickId ?? "—"}</div>
          </div>
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Position</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-100">{last?.position?.toFixed?.(4) ?? "—"}</div>
          </div>
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Cash</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-100">{last?.cash != null ? `$${last.cash.toFixed(2)}` : "—"}</div>
          </div>
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Buys</div>
            <div className="text-lg font-semibold tabular-nums text-emerald-400">{buys}</div>
          </div>
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Sells</div>
            <div className="text-lg font-semibold tabular-nums text-rose-400">{sells}</div>
          </div>
          <div className="p-3 bg-[#0f1623] border border-[#1c2538] rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">No-ops</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-400">{noops}</div>
          </div>
        </div>
      </section>

      {/* Reasoning column */}
      <section className="lg:col-span-1">
        <div className="p-4 bg-[#0f1623] border border-[#1c2538] rounded-xl h-full">
          <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 font-medium">Reasoning Stream</h3>
          {series.length === 0 ? (
            <p className="text-zinc-500 text-sm">Waiting for first tick…</p>
          ) : (
            <ul className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
              {series.slice().reverse().map((s) => (
                <li key={s.tickId} className="text-sm border-l-2 pl-3" style={{
                  borderColor: s.kind === "market_buy" ? "#22c55e" : s.kind === "market_sell" ? "#ef4444" : "#3f3f46",
                }}>
                  <div className="font-mono text-[10px] text-zinc-500">tick {s.tickId} · {s.kind}</div>
                  <div className="text-zinc-200">{s.reasoning || <span className="text-zinc-600 italic">(no reasoning)</span>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
