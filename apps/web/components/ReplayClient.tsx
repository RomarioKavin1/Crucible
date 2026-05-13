"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ScenarioReplay, AgentReasoningStream, PnLPanel, TradesTable } from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

export function ReplayClient({
  traceHash,
  scenarioId,
  proof,
}: {
  traceHash: string;
  scenarioId: string;
  proof?: ReactNode;
}) {
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
        Loading replay from 0G Storage...
      </div>
    );
  }

  const fills = entries.flatMap((e) => e.fills);
  const lastPortfolio = entries[entries.length - 1]?.portfolio;
  const lastPrice = ticks[ticks.length - 1]?.last ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f1623] border border-[#1f2a3d] rounded">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2a3d]">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] flex items-center gap-3">
              <span className="text-[#e5e9f0]">{scenarioId}</span>
              <span className="text-[#3a4456]">·</span>
              <span>{ticks.length} ticks</span>
              <span className="text-[#3a4456]">·</span>
              <span>{fills.length} fills</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#22d3ee]">▶ replay</div>
          </div>
          <div className="p-3">
            <ScenarioReplay ticks={ticks} fills={fills} height={420} />
          </div>
        </div>
        <div>{proof}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradesTable fills={fills} maxHeight={360} />
        {lastPortfolio && <PnLPanel portfolio={lastPortfolio} currentPrice={lastPrice} />}
      </div>

      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-2">Agent reasoning</h3>
        <AgentReasoningStream entries={entries} maxHeight={520} />
      </div>
    </div>
  );
}
