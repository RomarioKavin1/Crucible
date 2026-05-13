"use client";
import { useEffect, useState } from "react";
import {
  ScenarioReplay,
  AgentReasoningStream,
  PnLPanel,
  CoachingReport,
} from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

export function LiveRunView({ runId }: { runId: string }) {
  const [state, setState] = useState<"running" | "complete" | "error" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [coach, setCoach] = useState<{ markdown: string } | null>(null);
  const [coaching, setCoaching] = useState(false);

  useEffect(() => {
    fetch(`/api/runs/${runId}`).then((r) => r.json()).then((data) => {
      setEntries(data.entries ?? []);
      setTicks(data.ticks ?? []);
      setState(data.state ?? "loading");
    });

    const es = new EventSource(`/api/runs/${runId}/stream`);
    es.onmessage = (ev) => {
      const update = JSON.parse(ev.data);
      setState(update.state);
      if (update.error) setError(update.error);
      if (update.latest) setEntries((prev) => [...prev, update.latest]);
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [runId]);

  async function runCoachOnIt() {
    setCoaching(true);
    try {
      const r = await fetch(`/api/runs/${runId}/coach`, { method: "POST" });
      const data = await r.json();
      setCoach({ markdown: data.markdown });
    } finally { setCoaching(false); }
  }

  async function publish() {
    const agentId = prompt("Agent ID (mint via og-client CLI first):");
    if (!agentId) return;
    const network = prompt("Network (galileo|mainnet):", "galileo");
    if (!network) return;
    const r = await fetch(`/api/runs/${runId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, network }),
    });
    if (!r.ok) {
      const text = await r.text();
      alert(`Publish failed: ${text}`);
      return;
    }
    const data = await r.json();
    alert(`Published! runId=${data.runId} tx=${data.txHash}`);
  }

  const lastPortfolio = entries[entries.length - 1]?.portfolio;
  const currentTick = entries.length === 0 ? 0 : entries[entries.length - 1]!.tick;
  const fills = entries.flatMap((e) => e.fills);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Run <code>{runId}</code></h2>
        <div className="flex items-center gap-3">
          {state === "complete" && (
            <button onClick={publish} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs">
              Publish to leaderboard
            </button>
          )}
          <span className={`text-xs px-2 py-1 rounded ${stateColor(state)}`}>{state}</span>
        </div>
      </div>

      {error && <div className="text-red-400 bg-red-950/30 border border-red-800 rounded p-3">Error: {error}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ScenarioReplay ticks={ticks} fills={fills} currentTickIndex={currentTick} height={400} />
          <div className="text-sm text-slate-400">
            Tick {currentTick + 1} of {ticks.length}
          </div>
        </div>
        <div>
          {lastPortfolio && <PnLPanel portfolio={lastPortfolio} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Agent reasoning</h3>
          <AgentReasoningStream entries={entries} highlightTick={currentTick} maxHeight={500} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Coach report</h3>
            <button
              onClick={runCoachOnIt}
              disabled={state !== "complete" || coaching}
              className="bg-emerald-600 disabled:bg-slate-700 text-white px-3 py-1 rounded text-xs"
            >
              {coaching ? "Coaching..." : coach ? "Re-run coach" : "Run coach"}
            </button>
          </div>
          {coach ? (
            <CoachingReport markdown={coach.markdown} />
          ) : (
            <p className="text-sm text-slate-500">
              {state === "complete" ? "Click 'Run coach' to analyze this run." : "Coach available after run completes."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function stateColor(s: string) {
  return s === "complete" ? "bg-emerald-900 text-emerald-300" :
    s === "running" ? "bg-cyan-900 text-cyan-300" :
    s === "error" ? "bg-red-900 text-red-300" : "bg-slate-700 text-slate-300";
}
