"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScenarioReplay, AgentReasoningStream, TradesTable, EquityCurve, PlaybackControls,
} from "@crucible/ui-kit";
import type { TraceEntry, Tick, Portfolio } from "@crucible/core";

const DEFAULT_TICK_INTERVAL_MS = 600; // base interval at 1x speed

export function ReplayClient({ traceHash, scenarioId }: { traceHash: string; scenarioId: string }) {
  const [entries, setEntries] = useState<TraceEntry[] | null>(null);
  const [ticks, setTicks] = useState<Tick[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const lastInteractionRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const traceResp = await fetch(`/api/trace/${traceHash}`);
        if (!traceResp.ok) throw new Error(`trace fetch ${traceResp.status}`);
        const traceText = await traceResp.text();
        const ents = traceText.split("\n").filter(Boolean).map((l) => JSON.parse(l) as TraceEntry);
        setEntries(ents);

        const sResp = await fetch(`/api/scenario/${encodeURIComponent(scenarioId)}/ticks`);
        if (!sResp.ok) throw new Error(`scenario fetch ${sResp.status}`);
        const sJson = await sResp.json();
        setTicks(sJson.ticks);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [traceHash, scenarioId]);

  // When data first arrives, default cursor to the FINAL tick (so the page reads as
  // a completed run by default — user has to press play to see the replay).
  useEffect(() => {
    if (ticks && ticks.length > 0) {
      setCurrentTick(ticks.length - 1);
    }
  }, [ticks]);

  // Playback engine — advance currentTick at speed * baseInterval
  useEffect(() => {
    if (!isPlaying || !ticks) return;
    const intervalMs = DEFAULT_TICK_INTERVAL_MS / speed;
    const id = setInterval(() => {
      setCurrentTick((t) => {
        if (t >= ticks.length - 1) {
          setIsPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, speed, ticks]);

  const handlePlayToggle = useCallback(() => {
    if (!ticks) return;
    // If we're at the end and user hits play, restart from 0
    if (!isPlaying && currentTick >= ticks.length - 1) {
      setCurrentTick(0);
    }
    setIsPlaying((p) => !p);
    lastInteractionRef.current = Date.now();
  }, [isPlaying, currentTick, ticks]);

  const handleSeek = useCallback((tick: number) => {
    setIsPlaying(false);
    setCurrentTick(tick);
    lastInteractionRef.current = Date.now();
  }, []);

  const handleStep = useCallback((delta: number) => {
    if (!ticks) return;
    setIsPlaying(false);
    setCurrentTick((t) => Math.max(0, Math.min(ticks.length - 1, t + delta)));
  }, [ticks]);

  // Memoized helpers — recompute only when entries/ticks change
  const fillTickIndexes = useMemo(() => {
    if (!entries) return { buys: [], sells: [], news: [] };
    const buys: number[] = [], sells: number[] = [], news: number[] = [];
    for (const e of entries) {
      for (const f of e.fills) (f.side === "buy" ? buys : sells).push(e.tick);
      if (e.newsSeen.length > 0) news.push(e.tick);
    }
    return { buys, sells, news };
  }, [entries]);

  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef444466] rounded-2xl p-4 text-[#ef4444] text-[13px]">
        Failed to load trace: {error}
      </div>
    );
  }
  if (!entries || !ticks) {
    return (
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691] card-elevated">
        Loading replay from 0G Storage…
      </div>
    );
  }

  // Filter data to currentTick — chart, trades, and reasoning all advance in lockstep
  const visibleFills = entries.flatMap((e) => e.fills.filter(() => e.tick <= currentTick));
  const allFills = entries.flatMap((e) => e.fills);
  // Find the entry corresponding to currentTick (or the closest preceding one)
  const entryAtTick = [...entries].reverse().find((e) => e.tick <= currentTick) ?? entries[0];
  const portfolio: Portfolio | undefined = entryAtTick?.portfolio;
  const priceAtTick = ticks[currentTick]?.last ?? ticks[ticks.length - 1]?.last ?? 1;
  const equity = portfolio ? portfolio.cash + portfolio.position * priceAtTick : 10000;
  const equityChange = (equity - 10000) / 10000;
  const equityColor = equityChange >= 0 ? "#10b981" : "#ef4444";
  const totalTicks = ticks.length;

  return (
    <div className="space-y-6">
      {/* PRICE TAPE + PLAYER */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-medium text-[#e6e9f0]">Price tape</span>
            <span className="h-3 w-px bg-[#232d44]" />
            <span className="text-[11px] text-[#aab2c5]">
              <span className="font-mono text-[#e6e9f0]">{ticks.length}</span> ticks · <span className="font-mono text-[#e6e9f0]">{allFills.length}</span> fills
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#22d3ee]">
            <span className={`inline-block w-1.5 h-1.5 rounded-full bg-[#22d3ee] ${isPlaying ? "shadow-[0_0_8px_#22d3ee] animate-pulse" : ""}`} />
            {isPlaying ? "Playing" : currentTick >= totalTicks - 1 ? "End" : "Paused"}
          </div>
        </div>
        <div className="p-3">
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

      {/* EQUITY + POSITION strip — values reflect the current tick */}
      {portfolio && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-[#1c2538]">
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
            <SmallStat
              label="Realized PnL"
              value={`${portfolio.realizedPnl >= 0 ? "+" : ""}$${portfolio.realizedPnl.toFixed(2)}`}
              color={portfolio.realizedPnl >= 0 ? "#10b981" : "#ef4444"}
            />
            <SmallStat
              label="Drawdown"
              value={`${(Math.abs(portfolio.drawdownPct) * 100).toFixed(2)}%`}
              color="#ef4444"
            />
          </div>
        </div>
      )}

      {/* TRADES + REASONING — both filtered/highlighted by currentTick */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-stretch">
        <TradesTable
          fills={visibleFills}
          maxHeight={460}
          title={isPlaying || currentTick < totalTicks - 1 ? `Trades through tick ${currentTick}` : "Trades"}
        />
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden flex flex-col card-elevated">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Reasoning</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">
                {currentTick < totalTicks - 1 ? (
                  <>at tick <span className="font-mono text-[#22d3ee]">{currentTick}</span></>
                ) : (
                  <><span className="font-mono text-[#e6e9f0]">{entries.length}</span> ticks recorded</>
                )}
              </span>
            </div>
            <span className="text-[11px] text-[#6b7691]">{isPlaying ? "Auto-scroll" : "Scroll for full trace"}</span>
          </div>
          <div className="flex-1 min-h-0">
            <AgentReasoningStream
              entries={entries}
              maxHeight={510}
              bare
              highlightTick={currentTick}
              autoScrollToHighlight={isPlaying || currentTick < totalTicks - 1}
            />
          </div>
        </div>
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
