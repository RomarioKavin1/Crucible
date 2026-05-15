"use client";
import { useEffect, useMemo, useRef } from "react";
import { ScenarioReplay, EquityCurve, TradesTable } from "@crucible/ui-kit";
import type { TraceEntry, Tick, Portfolio, Fill } from "@crucible/core";

const INITIAL_EQUITY = 10000;

interface Frame {
  type: string;
  payload?: any;
  ts?: number;
}

interface AdaptedLive {
  ticks: Tick[];
  entries: TraceEntry[];
  fills: Fill[];
  series: {
    tickId: number;
    price: number;
    equity: number;
    cash: number;
    position: number;
    kind: "market_buy" | "market_sell" | "noop";
    reasoning: string;
    qty: number;
  }[];
}

/**
 * Adapt the live frame stream into the same Tick/TraceEntry/Fill shape that
 * the offline replay components consume. v2 frames carry per-tick observations
 * directly, so we don't need to fetch a separate scenario bundle.
 */
function adaptFrames(frames: Frame[]): AdaptedLive {
  const ticks: Tick[] = [];
  const entries: TraceEntry[] = [];
  const fills: Fill[] = [];
  const series: AdaptedLive["series"] = [];
  const baseTs = Date.now();

  for (const f of frames) {
    if (f.type !== "tick") continue;
    const p = f.payload ?? {};
    const obs = p.observation;
    if (!obs) continue;

    const ts = new Date(baseTs - (frames.length - (p.tickId ?? 0)) * 1000).toISOString();
    const tick: Tick = {
      ts,
      last: obs.price ?? 0,
      bid: obs.bid ?? obs.price ?? 0,
      ask: obs.ask ?? obs.price ?? 0,
      mid: ((obs.bid ?? obs.price ?? 0) + (obs.ask ?? obs.price ?? 0)) / 2,
      volume: 0,
    } as Tick;
    ticks.push(tick);

    const tickFills: Fill[] = [];
    const kind = (p.action?.kind ?? "noop") as "market_buy" | "market_sell" | "noop";
    const qtyRaw = p.action?.qty ?? "0";
    const qty = (() => {
      try { return Number(BigInt(qtyRaw)) / 1e18; } catch { return Number(qtyRaw) || 0; }
    })();
    if (kind === "market_buy" && qty > 0) {
      const fl: Fill = { orderId: `m-${p.tickId}`, side: "buy", qty, price: obs.ask ?? obs.price, feeBps: 0, ts, tick: p.tickId };
      tickFills.push(fl); fills.push(fl);
    } else if (kind === "market_sell" && qty > 0) {
      const fl: Fill = { orderId: `m-${p.tickId}`, side: "sell", qty, price: obs.bid ?? obs.price, feeBps: 0, ts, tick: p.tickId };
      tickFills.push(fl); fills.push(fl);
    }

    const portfolio: Portfolio = {
      cash: obs.cash ?? 0,
      position: obs.position ?? 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      drawdownPct: 0,
    } as Portfolio;

    entries.push({
      tick: p.tickId,
      ts,
      market: tick,
      newsSeen: (obs.news ?? []) as any,
      agent: {
        completions: p.action?.reasoning ? [{ role: "assistant", content: p.action.reasoning } as any] : [],
        toolCalls: kind === "noop" ? [] : [{ name: kind, args: { qty: qtyRaw } } as any],
      } as any,
      fills: tickFills,
      portfolio,
    } as TraceEntry);

    series.push({
      tickId: p.tickId,
      price: obs.price ?? 0,
      equity: obs.equity ?? (obs.cash ?? 0) + (obs.position ?? 0) * (obs.price ?? 0),
      cash: obs.cash ?? 0,
      position: obs.position ?? 0,
      kind,
      reasoning: p.action?.reasoning ?? "",
      qty,
    });
  }
  return { ticks, entries, fills, series };
}

export function LiveRunReplay({ frames }: { frames: Frame[] }) {
  const { ticks, entries, fills, series } = useMemo(() => adaptFrames(frames), [frames]);
  const last = series[series.length - 1];
  const buys = series.filter((s) => s.kind === "market_buy").length;
  const sells = series.filter((s) => s.kind === "market_sell").length;
  const noops = series.filter((s) => s.kind === "noop").length;

  const equity = last?.equity ?? INITIAL_EQUITY;
  const equityChange = (equity - INITIAL_EQUITY) / INITIAL_EQUITY;
  const equityColor = equityChange >= 0 ? "#10b981" : "#ef4444";
  const lastFill = fills[fills.length - 1];

  // Auto-scroll the reasoning stream to the newest entry.
  const reasoningRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (reasoningRef.current) reasoningRef.current.scrollTop = 0;
  }, [series.length]);

  // Empty state — before first tick lands.
  if (ticks.length === 0) {
    return (
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691] card-elevated">
        Waiting for the first tick from the agent…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart + reasoning row — same layout as the run page */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:h-[560px]">
        {/* Chart card */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Price tape</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">
                <span className="font-mono text-[#e6e9f0]">{ticks.length}</span> ticks ·{" "}
                <span className="font-mono text-[#e6e9f0]">{fills.length}</span> fills
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#22d3ee]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] animate-pulse" />
              Live
            </div>
          </div>
          <div className="p-3 flex-1">
            <ScenarioReplay ticks={ticks} fills={fills} currentTickIndex={ticks.length - 1} height={420} />
          </div>
        </div>

        {/* Reasoning card */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Reasoning</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">streaming · tick <span className="font-mono text-[#22d3ee]">{last?.tickId ?? 0}</span></span>
            </div>
          </div>
          <ul ref={reasoningRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {series.slice().reverse().map((s) => (
              <li
                key={s.tickId}
                className="border-l-2 pl-3 py-1.5"
                style={{
                  borderColor: s.kind === "market_buy" ? "#10b981" : s.kind === "market_sell" ? "#ef4444" : "#3a4456",
                }}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6b7691] mb-0.5">
                  <span>tick {s.tickId}</span>
                  <span>·</span>
                  <span style={{
                    color: s.kind === "market_buy" ? "#10b981" : s.kind === "market_sell" ? "#ef4444" : "#6b7691",
                  }}>
                    {s.kind === "market_buy" ? "▲ BUY" : s.kind === "market_sell" ? "▼ SELL" : "○ noop"}
                    {s.qty > 0 && ` ${s.qty.toFixed(4)}`}
                  </span>
                </div>
                <div className="text-[12px] leading-relaxed text-[#e6e9f0]">
                  {s.reasoning || <span className="text-[#6b7691] italic">(no reasoning)</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Equity strip — same as run page */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-[#1c2538]">
          <div className="px-5 py-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Equity</span>
              <span className="text-[11px] font-mono" style={{ color: equityColor }}>
                {equityChange >= 0 ? "+" : ""}{(equityChange * 100).toFixed(2)}%
              </span>
            </div>
            <div className="font-mono text-[24px] text-[#e6e9f0] leading-tight tabular-nums">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-3">
              <EquityCurve entries={entries} ticks={ticks} height={42} currentTickIndex={ticks.length - 1} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6b7691]">
              <span>Start <span className="font-mono text-[#aab2c5]">${INITIAL_EQUITY.toLocaleString()}</span></span>
              <span>P/L <span className="font-mono tabular-nums" style={{ color: equityColor }}>{equityChange >= 0 ? "+" : ""}${(equity - INITIAL_EQUITY).toFixed(2)}</span></span>
            </div>
          </div>
          <SmallStat label="Position" value={(last?.position ?? 0).toFixed(4)} />
          <SmallStat label="Cash" value={`$${(last?.cash ?? 0).toFixed(2)}`} />
          <SmallStat label="Price" value={`$${(last?.price ?? 0).toFixed(2)}`} />
        </div>
      </div>

      {/* Action breakdown strip */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#1c2538]">
          <SmallStat label="Buys" value={buys.toString()} color="#10b981" />
          <SmallStat label="Sells" value={sells.toString()} color="#ef4444" />
          <SmallStat label="No-ops" value={noops.toString()} color="#6b7691" />
          <SmallStat
            label="Last fill"
            value={
              lastFill
                ? `${lastFill.side === "buy" ? "▲" : "▼"} ${lastFill.qty.toFixed(4)} @ $${lastFill.price.toFixed(2)}`
                : "—"
            }
            color={lastFill ? (lastFill.side === "buy" ? "#10b981" : "#ef4444") : undefined}
          />
          <SmallStat label="Ticks" value={ticks.length.toString()} />
        </div>
      </div>

      {/* Trades table */}
      <TradesTable fills={fills} maxHeight={360} title={`Trades (${fills.length} total)`} />
    </div>
  );
}

function SmallStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-5 py-4 flex flex-col justify-between">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-2 font-medium">{label}</div>
      <div className="font-mono text-[18px] tabular-nums truncate" style={{ color: color ?? "#e6e9f0" }}>{value}</div>
    </div>
  );
}
