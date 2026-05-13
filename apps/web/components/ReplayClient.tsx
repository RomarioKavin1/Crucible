"use client";
import { useEffect, useState } from "react";
import { ScenarioReplay, AgentReasoningStream, TradesTable, EquityCurve } from "@crucible/ui-kit";
import type { TraceEntry, Tick, Portfolio } from "@crucible/core";

export function ReplayClient({ traceHash, scenarioId }: { traceHash: string; scenarioId: string }) {
  const [entries, setEntries] = useState<TraceEntry[] | null>(null);
  const [ticks, setTicks] = useState<Tick[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef4444] rounded p-4 text-[#ef4444] font-mono text-sm">
        Failed to load trace: {error}
      </div>
    );
  }
  if (!entries || !ticks) {
    return (
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-12 text-center font-mono text-sm text-[#5e6b80]">
        Loading replay from 0G Storage…
      </div>
    );
  }

  const fills = entries.flatMap((e) => e.fills);
  const lastEntry = entries[entries.length - 1];
  const portfolio: Portfolio | undefined = lastEntry?.portfolio;
  const lastPrice = ticks[ticks.length - 1]?.last ?? 1;
  const equity = portfolio ? portfolio.cash + portfolio.position * lastPrice : 10000;
  const equityChange = (equity - 10000) / 10000;
  const equityColor = equityChange >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-5">
      {/* PRICE TAPE — full width */}
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2a3d]">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] flex items-center gap-3">
            <span className="text-[#e5e9f0]">Price tape</span>
            <span className="text-[#3a4456]">·</span>
            <span><span className="text-[#e5e9f0] tabular-nums">{ticks.length}</span> ticks</span>
            <span className="text-[#3a4456]">·</span>
            <span><span className="text-[#e5e9f0] tabular-nums">{fills.length}</span> fills</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#22d3ee]">▶ replay</div>
        </div>
        <div className="p-3">
          <ScenarioReplay ticks={ticks} fills={fills} height={420} />
        </div>
      </div>

      {/* EQUITY + POSITION strip */}
      {portfolio && (
        <div className="bg-[#0f1623] border border-[#1f2a3d] rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-[#1f2a3d]">
            {/* Equity hero with curve */}
            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80]">Equity</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: equityColor }}>
                  {equityChange >= 0 ? "+" : ""}{(equityChange * 100).toFixed(2)}%
                </span>
              </div>
              <div className="font-mono text-2xl tabular-nums text-[#e5e9f0]">
                ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 h-12">
                <EquityCurve entries={entries} ticks={ticks} height={48} />
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-[#5e6b80] uppercase tracking-[0.18em]">
                <span>start $10,000</span>
                <span>end ${equity.toFixed(0)}</span>
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

      {/* TRADES + REASONING — equal-height side-by-side columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-stretch">
        <div className="flex flex-col">
          <TradesTable fills={fills} maxHeight={460} />
        </div>
        <div className="bg-[#0f1623] border border-[#1f2a3d] rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2a3d]">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80]">
              <span className="text-[#e5e9f0]">Reasoning</span>
              <span className="text-[#3a4456] mx-2">·</span>
              <span>{entries.length} ticks recorded</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5e6b80]">scroll</span>
          </div>
          <div className="flex-1 min-h-0">
            <AgentReasoningStream entries={entries} maxHeight={510} bare />
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-1">{label}</div>
      <div className="font-mono text-lg tabular-nums" style={{ color: color ?? "#e5e9f0" }}>{value}</div>
    </div>
  );
}
