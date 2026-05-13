"use client";
import { useEffect, useState } from "react";
import { ScenarioReplay, AgentReasoningStream, PnLPanel } from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

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

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!entries || !ticks) return <p className="text-slate-400">Loading replay...</p>;

  const fills = entries.flatMap((e) => e.fills);
  const lastPortfolio = entries[entries.length - 1]?.portfolio;
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScenarioReplay ticks={ticks} fills={fills} height={400} />
        </div>
        <div>{lastPortfolio && <PnLPanel portfolio={lastPortfolio} />}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Agent reasoning</h3>
        <AgentReasoningStream entries={entries} maxHeight={600} />
      </div>
    </div>
  );
}
