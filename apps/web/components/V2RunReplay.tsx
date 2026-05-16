"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScenarioReplay, AgentReasoningStream, TradesTable, EquityCurve, PlaybackControls,
} from "@crucible/ui-kit";
import type { TraceEntry, Tick, Portfolio, Fill } from "@crucible/core";
import { storageDownload } from "@/lib/network";
const DEFAULT_TICK_INTERVAL_MS = 600;

interface V2TraceLine {
  tickId: number;
  observation: {
    tickId: number;
    price: number;
    bid: number;
    ask: number;
    position: number;
    cash: number;
    equity: number;
    news?: { ts?: string; headline: string; source?: string }[];
    ticksRemaining?: number;
  };
  action: { kind: "market_buy" | "market_sell" | "noop"; qty: string; reasoning: string };
  signature?: string | null;
  signer?: string | null;
}

/**
 * Adapt a v2 trace into the v1 TraceEntry+Tick shape that the ui-kit replay
 * components consume. v2 stores per-tick observations directly in the trace,
 * so we don't need to fetch the original scenario bundle.
 */
function adaptV2(lines: V2TraceLine[]): { ticks: Tick[]; entries: TraceEntry[]; allFills: Fill[] } {
  const ticks: Tick[] = [];
  const entries: TraceEntry[] = [];
  const allFills: Fill[] = [];

  for (const ln of lines) {
    const obs = ln.observation;
    const ts = new Date(Date.now() - (lines.length - ln.tickId) * 1000).toISOString();

    const tick: Tick = {
      ts,
      last: obs.price,
      bid: obs.bid,
      ask: obs.ask,
      mid: (obs.bid + obs.ask) / 2,
      volume: 0,
    } as Tick;
    ticks.push(tick);

    // Derive a synthetic Fill from the action (v2 doesn't separately record fills
    // — they're 1:1 with non-noop actions).
    const fills: Fill[] = [];
    const qty = Number(BigInt(ln.action.qty)) / 1e18;
    if (ln.action.kind === "market_buy" && qty > 0) {
      const f: Fill = {
        orderId: `m-${ln.tickId}`, side: "buy", qty, price: obs.ask,
        feeBps: 0, ts, tick: ln.tickId,
      };
      fills.push(f);
      allFills.push(f);
    } else if (ln.action.kind === "market_sell" && qty > 0) {
      const f: Fill = {
        orderId: `m-${ln.tickId}`, side: "sell", qty, price: obs.bid,
        feeBps: 0, ts, tick: ln.tickId,
      };
      fills.push(f);
      allFills.push(f);
    }

    const portfolio: Portfolio = {
      cash: obs.cash,
      position: obs.position,
      realizedPnl: 0,         // v2 doesn't track separately; approximated as 0
      unrealizedPnl: 0,       // computed by EquityCurve from cash + position * price
      drawdownPct: 0,
    } as Portfolio;

    const entry: TraceEntry = {
      tick: ln.tickId,
      ts,
      market: tick,
      newsSeen: (obs.news ?? []) as any,
      agent: {
        completions: ln.action.reasoning
          ? [{ role: "assistant", content: ln.action.reasoning } as any]
          : [],
        toolCalls: ln.action.kind === "noop" ? [] : [{
          name: ln.action.kind,
          args: { qty: ln.action.qty },
        } as any],
      } as any,
      fills,
      portfolio,
    } as TraceEntry;
    entries.push(entry);
  }
  return { ticks, entries, allFills };
}

export function V2RunReplay({ traceRoot }: { traceRoot: string }) {
  const [data, setData] = useState<{ ticks: Tick[]; entries: TraceEntry[]; allFills: Fill[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showFullTrace, setShowFullTrace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(storageDownload(traceRoot));
        if (!res.ok) throw new Error(`storage ${res.status}`);
        const text = await res.text();
        // Filter out the meta header line (and any future non-tick lines).
        // Tick lines always carry an `observation` field; meta lines don't.
        const lines = text
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l))
          .filter((o: any) => o && o.observation && o.action)
          .map((o) => o as V2TraceLine);
        if (cancelled) return;
        const adapted = adaptV2(lines);
        setData(adapted);
        setCurrentTick(adapted.ticks.length - 1);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [traceRoot]);

  useEffect(() => {
    if (!isPlaying || !data) return;
    const intervalMs = DEFAULT_TICK_INTERVAL_MS / speed;
    const id = setInterval(() => {
      setCurrentTick((t) => {
        if (t >= data.ticks.length - 1) {
          setIsPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, speed, data]);

  const handlePlayToggle = useCallback(() => {
    if (!data) return;
    if (!isPlaying && currentTick >= data.ticks.length - 1) setCurrentTick(0);
    setIsPlaying((p) => !p);
  }, [isPlaying, currentTick, data]);

  const handleSeek = useCallback((tick: number) => {
    setIsPlaying(false);
    setCurrentTick(tick);
  }, []);

  const handleStep = useCallback((delta: number) => {
    if (!data) return;
    setIsPlaying(false);
    setCurrentTick((t) => Math.max(0, Math.min(data.ticks.length - 1, t + delta)));
  }, [data]);

  const fillTickIndexes = useMemo(() => {
    if (!data) return { buys: [], sells: [], news: [] };
    const buys: number[] = [], sells: number[] = [], news: number[] = [];
    for (const e of data.entries) {
      for (const f of e.fills) (f.side === "buy" ? buys : sells).push(e.tick);
      if (e.newsSeen.length > 0) news.push(e.tick);
    }
    return { buys, sells, news };
  }, [data]);

  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef444466] rounded-2xl p-4 text-[#ef4444] text-[13px]">
        Failed to load trace: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691] card-elevated">
        Loading replay from 0G Storage…
      </div>
    );
  }

  const { ticks, entries, allFills } = data;
  const visibleFills = entries.flatMap((e) => e.fills.filter(() => e.tick <= currentTick));
  const entryAtTick = entries[currentTick] ?? [...entries].reverse().find((e) => e.tick <= currentTick) ?? entries[0]!;
  const portfolio = entryAtTick.portfolio;
  const priceAtTick = ticks[currentTick]?.last ?? ticks[ticks.length - 1]?.last ?? 1;
  const equity = portfolio.cash + portfolio.position * priceAtTick;
  const equityChange = (equity - 10000) / 10000;
  const equityColor = equityChange >= 0 ? "#10b981" : "#ef4444";
  const totalTicks = ticks.length;

  return (
    <div className="space-y-6">
      {/* Chart + reasoning row */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:h-[560px]">
        {/* Chart card */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Price tape</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">
                <span className="font-mono text-[#e6e9f0]">{ticks.length}</span> ticks ·{" "}
                <span className="font-mono text-[#e6e9f0]">{allFills.length}</span> fills
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#22d3ee]">
              <span className={`inline-block w-1.5 h-1.5 rounded-full bg-[#22d3ee] ${isPlaying ? "animate-pulse" : ""}`} />
              {isPlaying ? "Playing" : currentTick >= totalTicks - 1 ? "End" : "Paused"}
            </div>
          </div>
          <div className="p-3 flex-1">
            <ScenarioReplay ticks={ticks} fills={allFills} currentTickIndex={currentTick} height={420} />
          </div>
          <PlaybackControls
            currentTick={currentTick}
            totalTicks={totalTicks}
            isPlaying={isPlaying}
            speed={speed}
            onPlayToggle={handlePlayToggle}
            onSeek={handleSeek}
            onStep={handleStep}
            onSpeedChange={setSpeed}
            buyTicks={fillTickIndexes.buys}
            sellTicks={fillTickIndexes.sells}
            newsTicks={fillTickIndexes.news}
          />
        </div>

        {/* Reasoning card */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Reasoning</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">
                {showFullTrace ? "Full trace" : (
                  <>tick <span className="font-mono text-[#22d3ee]">{currentTick}</span> of{" "}
                  <span className="font-mono text-[#aab2c5]">{totalTicks - 1}</span></>
                )}
              </span>
            </div>
            <button type="button" onClick={() => setShowFullTrace((v) => !v)}
              className="text-[11px] text-[#22d3ee] hover:text-[#67e8f9] transition-colors">
              {showFullTrace ? "Focus mode" : "Show full trace ↓"}
            </button>
          </div>
          {showFullTrace ? (
            <div className="flex-1 min-h-0">
              <AgentReasoningStream entries={entries} maxHeight={510} bare highlightTick={currentTick} autoScrollToHighlight />
            </div>
          ) : (
            <ReasoningFocus
              entry={entryAtTick}
              currentTick={currentTick}
              totalTicks={totalTicks}
              onPrev={() => handleStep(-1)}
              onNext={() => handleStep(1)}
            />
          )}
        </div>
      </div>

      {/* Equity strip */}
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
              <EquityCurve entries={entries} ticks={ticks} height={42} currentTickIndex={currentTick} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6b7691]">
              <span>Start <span className="font-mono text-[#aab2c5]">$10,000</span></span>
              <span>At tick <span className="font-mono text-[#aab2c5]">{currentTick}</span></span>
            </div>
          </div>
          <SmallStat label="Position" value={portfolio.position.toString()} />
          <SmallStat label="Cash" value={`$${portfolio.cash.toFixed(2)}`} />
          <SmallStat label="Price" value={`$${priceAtTick.toFixed(2)}`} />
        </div>
      </div>

      {/* Trades */}
      <TradesTable
        fills={visibleFills}
        maxHeight={360}
        title={currentTick < totalTicks - 1 ? `Trades through tick ${currentTick}` : "Trades"}
      />
    </div>
  );
}

function ReasoningFocus({
  entry, currentTick, totalTicks, onPrev, onNext,
}: {
  entry: TraceEntry;
  currentTick: number;
  totalTicks: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hasNews = entry.newsSeen.length > 0;
  const hasFills = entry.fills.length > 0;
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-medium text-[#aab2c5]">
            <span className="font-mono text-[#22d3ee]">tick {entry.tick}</span>
          </span>
        </div>
        {hasNews && (
          <div className="mb-4 p-3 rounded-lg bg-[#fbbf240a] border border-[#fbbf2433]">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-[#fbbf24] mb-1.5">News</div>
            {entry.newsSeen.map((n: any, i: number) => (
              <div key={i} className="text-[12px] text-[#e6e9f0] leading-relaxed">{n.headline}</div>
            ))}
          </div>
        )}
        <div className="space-y-3">
          {entry.agent.completions.length === 0 ? (
            <div className="text-[12px] text-[#6b7691] italic">No agent output for this tick.</div>
          ) : (
            entry.agent.completions.map((c: any, i: number) => (
              <div key={i} className="text-[14px] leading-[1.65] text-[#e6e9f0] whitespace-pre-wrap">
                {c.content || <em className="text-[#6b7691]">(no text content)</em>}
              </div>
            ))
          )}
        </div>
        {entry.agent.toolCalls.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1c2538] space-y-1">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1.5">Action</div>
            {entry.agent.toolCalls.map((tc: any, i: number) => (
              <div key={i} className="font-mono text-[12px] text-[#22d3ee] break-all">
                → {tc.name}({JSON.stringify(tc.args)})
              </div>
            ))}
          </div>
        )}
        {hasFills && (
          <div className="mt-4 pt-3 border-t border-[#1c2538] space-y-1">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium mb-1.5">Fills</div>
            {entry.fills.map((f: Fill, i: number) => (
              <div key={i} className="font-mono text-[12px] flex items-center gap-1"
                style={{ color: f.side === "buy" ? "#10b981" : "#ef4444" }}>
                <span>{f.side === "buy" ? "▲" : "▼"}</span>
                <span className="font-medium">{f.side.toUpperCase()}</span>
                <span>{f.qty} @ ${f.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-[#1c2538] flex items-center justify-between px-4 py-2.5 bg-[#0a0e17]">
        <button type="button" onClick={onPrev} disabled={currentTick === 0}
          className="text-[12px] font-medium text-[#aab2c5] hover:text-[#e6e9f0] disabled:text-[#3a4456] disabled:cursor-not-allowed transition-colors flex items-center gap-1">
          <span aria-hidden>‹</span> Previous
        </button>
        <span className="text-[11px] text-[#6b7691] font-mono">{currentTick + 1} / {totalTicks}</span>
        <button type="button" onClick={onNext} disabled={currentTick >= totalTicks - 1}
          className="text-[12px] font-medium text-[#aab2c5] hover:text-[#e6e9f0] disabled:text-[#3a4456] disabled:cursor-not-allowed transition-colors flex items-center gap-1">
          Next <span aria-hidden>›</span>
        </button>
      </div>
    </div>
  );
}

function SmallStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-5 py-4 flex flex-col justify-between">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-2 font-medium">{label}</div>
      <div className="font-mono text-[18px] tabular-nums" style={{ color: color ?? "#e6e9f0" }}>{value}</div>
    </div>
  );
}
