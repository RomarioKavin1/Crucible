import type { TraceEntry } from "@crucible/core";

export interface AgentReasoningStreamProps {
  entries: TraceEntry[];
  highlightTick?: number;
  maxHeight?: number;
}

export function AgentReasoningStream({ entries, highlightTick, maxHeight = 600 }: AgentReasoningStreamProps) {
  return (
    <div style={{ maxHeight, overflowY: "auto" }} className="space-y-3 font-mono text-sm">
      {entries.map((e) => {
        const isHighlight = e.tick === highlightTick;
        return (
          <div
            key={e.tick}
            className={`p-3 rounded border ${isHighlight ? "border-blue-400 bg-blue-950/30" : "border-slate-700 bg-slate-900/40"}`}
          >
            <div className="text-xs text-slate-500 mb-1">Tick {e.tick} · {e.ts}</div>
            {e.newsSeen.length > 0 && (
              <div className="mb-2 text-amber-300">
                📰 {e.newsSeen.map((n) => n.headline).join(" · ")}
              </div>
            )}
            {e.agent.completions.map((c, i) => (
              <div key={i} className="mb-2 whitespace-pre-wrap text-slate-200">
                {c.content || <em className="text-slate-500">(no text content)</em>}
              </div>
            ))}
            {e.agent.toolCalls.length > 0 && (
              <div className="space-y-1">
                {e.agent.toolCalls.map((tc, i) => (
                  <div key={i} className="text-cyan-400">
                    → {tc.name}({JSON.stringify(tc.args)})
                  </div>
                ))}
              </div>
            )}
            {e.fills.length > 0 && (
              <div className="mt-1 text-green-400">
                ✓ Filled: {e.fills.map((f) => `${f.side} ${f.qty}@${f.price.toFixed(2)}`).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
