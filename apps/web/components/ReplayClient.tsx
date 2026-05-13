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

  const fills = entries.flatMap((e) => e.fills);
  const lastEntry = entries[entries.length - 1];
  const portfolio: Portfolio | undefined = lastEntry?.portfolio;
  const lastPrice = ticks[ticks.length - 1]?.last ?? 1;
  const equity = portfolio ? portfolio.cash + portfolio.position * lastPrice : 10000;
  const equityChange = (equity - 10000) / 10000;
  const equityColor = equityChange >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-6">
      {/* PRICE TAPE */}
      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c2538]">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-medium text-[#e6e9f0]">Price tape</span>
            <span className="h-3 w-px bg-[#232d44]" />
            <span className="text-[11px] text-[#aab2c5]">
              <span className="font-mono text-[#e6e9f0]">{ticks.length}</span> ticks · <span className="font-mono text-[#e6e9f0]">{fills.length}</span> fills
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#22d3ee]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
            Replay
          </div>
        </div>
        <div className="p-3">
          <ScenarioReplay ticks={ticks} fills={fills} height={420} />
        </div>
      </div>

      {/* EQUITY + POSITION strip */}
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
              <div className="font-mono text-[24px] text-[#e6e9f0] leading-tight">
                ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-3">
                <EquityCurve entries={entries} ticks={ticks} height={42} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6b7691]">
                <span>Start <span className="font-mono text-[#aab2c5]">$10,000</span></span>
                <span>End <span className="font-mono text-[#aab2c5]">${equity.toFixed(0)}</span></span>
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

      {/* TRADES + REASONING */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-stretch">
        <TradesTable fills={fills} maxHeight={460} />
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden flex flex-col card-elevated">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2538]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#e6e9f0]">Reasoning</span>
              <span className="h-3 w-px bg-[#232d44]" />
              <span className="text-[11px] text-[#aab2c5]">
                <span className="font-mono text-[#e6e9f0]">{entries.length}</span> ticks recorded
              </span>
            </div>
            <span className="text-[11px] text-[#6b7691]">Scroll for full trace</span>
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
    <div className="px-5 py-4 flex flex-col justify-between">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] mb-2 font-medium">{label}</div>
      <div className="font-mono text-[18px]" style={{ color: color ?? "#e6e9f0" }}>{value}</div>
    </div>
  );
}
