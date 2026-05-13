"use client";
import { useEffect, useState } from "react";
import {
  ScenarioReplay,
  AgentReasoningStream,
  PnLPanel,
  CoachingReport,
} from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

// TODO: elapsed timer starts at component mount. For runs already complete when
// viewed, this will show 0:00 instead of the actual run duration. Acceptable for v1.

export function LiveRunView({ runId }: { runId: string }) {
  const [state, setState] = useState<"running" | "complete" | "error" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [coach, setCoach] = useState<{ markdown: string } | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
    setDrawerOpen(true);
    try {
      const r = await fetch(`/api/runs/${runId}/coach`, { method: "POST" });
      const data = await r.json();
      setCoach({ markdown: data.markdown });
    } finally {
      setCoaching(false);
    }
  }

  async function publish() {
    const agentId = prompt("Agent ID (mint via og-client first):");
    if (!agentId) return;
    const network = prompt("Network (galileo|mainnet):", "galileo");
    if (!network) return;
    const r = await fetch(`/api/runs/${runId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, network }),
    });
    if (!r.ok) {
      alert(`Publish failed: ${await r.text()}`);
      return;
    }
    const data = await r.json();
    alert(`Published! runId=${data.runId} tx=${data.txHash}`);
  }

  const lastEntry = entries[entries.length - 1];
  const lastPortfolio = lastEntry?.portfolio;
  const currentTick = lastEntry?.tick ?? 0;
  const fills = entries.flatMap((e) => e.fills);
  const lastPrice = ticks[currentTick]?.last ?? 1;
  const elapsedSec = Math.floor((now - startedAt) / 1000);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Run</div>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-[#e5e9f0] truncate">{runId}</h1>
        <div className="flex items-center gap-4 mt-2 font-mono text-[11px] uppercase tracking-[0.2em]">
          <StatusPill state={state} />
          <span className="text-[#5e6b80]">tick <span className="text-[#e5e9f0] tabular-nums">{currentTick + (entries.length === 0 ? 0 : 1)}</span> / {ticks.length}</span>
          <span className="text-[#5e6b80]">elapsed <span className="text-[#e5e9f0] tabular-nums">{Math.floor(elapsedSec / 60)}:{(elapsedSec % 60).toString().padStart(2, "0")}</span></span>
        </div>
      </div>

      {error && (
        <div className="bg-[#ef444411] border border-[#ef4444] rounded p-3 font-mono text-sm text-[#ef4444]">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#0f1623] border border-[#1f2a3d] rounded">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2a3d]">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] flex items-center gap-3">
              <span className="text-[#e5e9f0]">Live tape</span>
              <span>·</span>
              <span>tick {currentTick} / {ticks.length}</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#22d3ee]">▶ live</div>
          </div>
          <div className="p-3">
            <ScenarioReplay ticks={ticks} fills={fills} currentTickIndex={currentTick} height={360} />
          </div>
        </div>
        <div>
          {lastPortfolio ? (
            <PnLPanel portfolio={lastPortfolio} currentPrice={lastPrice} />
          ) : (
            <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-4 font-mono text-xs text-[#5e6b80]">
              waiting for first tick...
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-2">Agent stream</h3>
        <AgentReasoningStream entries={entries} highlightTick={currentTick} newestFirst maxHeight={500} />
      </div>

      {state === "complete" && (
        <div className="sticky bottom-4 z-20">
          <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-3 flex items-center justify-between gap-3 shadow-[0_0_60px_-20px_#22d3ee44]">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5e6b80]">
              Run complete · ready to coach or publish
            </div>
            <div className="flex gap-2">
              <button
                onClick={runCoachOnIt}
                disabled={coaching}
                className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#22d3ee] hover:bg-[#67e8f9] disabled:bg-[#1f2a3d] disabled:text-[#5e6b80] text-[#070b14] px-4 py-2 rounded"
              >
                {coaching ? "Coaching..." : "Coach this run"}
              </button>
              <button
                onClick={publish}
                className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#0f1623] border border-[#a855f7] hover:bg-[#a855f7] hover:text-[#070b14] text-[#a855f7] px-4 py-2 rounded transition-colors"
              >
                Publish to leaderboard ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-30 flex justify-end" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-2xl h-full bg-[#0f1623] border-l border-[#1f2a3d] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-[#e5e9f0]">Coach Report</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="font-mono text-xs text-[#5e6b80] hover:text-[#e5e9f0]"
              >
                close ✕
              </button>
            </div>
            {coaching && !coach ? (
              <div className="font-mono text-[#5e6b80] text-sm">Analyzing run via 0G Compute...</div>
            ) : coach ? (
              <CoachingReport markdown={coach.markdown} />
            ) : (
              <div className="font-mono text-[#5e6b80] text-sm">No report yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ state }: { state: "running" | "complete" | "error" | "loading" }) {
  const map: Record<typeof state, { color: string; label: string; pulse: boolean }> = {
    running: { color: "#22d3ee", label: "running", pulse: true },
    complete: { color: "#10b981", label: "complete", pulse: false },
    error: { color: "#ef4444", label: "error", pulse: false },
    loading: { color: "#5e6b80", label: "loading", pulse: false },
  };
  const cfg = map[state];
  return (
    <span className="flex items-center gap-2 text-[#e5e9f0]">
      <span className="relative flex h-1.5 w-1.5">
        {cfg.pulse && (
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: cfg.color }} />
        )}
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}aa` }} />
      </span>
      <span style={{ color: cfg.color }}>{cfg.label}</span>
    </span>
  );
}
