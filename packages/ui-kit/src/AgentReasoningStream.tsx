import type { TraceEntry } from "@crucible/core";

export interface AgentReasoningStreamProps {
  entries: TraceEntry[];
  /** Highlight this tick with a pulsing cyan left-border. */
  highlightTick?: number;
  /** Reverse chronological order — newest at top. Default false. */
  newestFirst?: boolean;
  maxHeight?: number;
}

export function AgentReasoningStream({
  entries, highlightTick, newestFirst = false, maxHeight = 600,
}: AgentReasoningStreamProps) {
  const ordered = newestFirst ? [...entries].reverse() : entries;
  return (
    <div
      style={{ maxHeight, overflowY: "auto" }}
      className="space-y-2 font-mono text-xs bg-[#0f1623] border border-[#1f2a3d] rounded p-3"
    >
      {ordered.map((e) => {
        const isHighlight = e.tick === highlightTick;
        const hasNews = e.newsSeen.length > 0;
        return (
          <div
            key={e.tick}
            className={`p-2.5 rounded border-l-2 ${
              isHighlight
                ? "border-l-[#22d3ee] bg-[#22d3ee08]"
                : hasNews
                ? "border-l-[#fbbf24] bg-[#fbbf2408]"
                : "border-l-[#1f2a3d]"
            }`}
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#5e6b80] mb-1">
              <span className="text-[#e5e9f0]">tick {e.tick}</span>
              <span>{e.ts}</span>
              {isHighlight && (
                <span className="ml-auto flex items-center gap-1 text-[#22d3ee]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22d3ee]" />
                  </span>
                  live
                </span>
              )}
            </div>
            {hasNews && (
              <div className="mb-2 text-[#fbbf24] text-[11px]">
                📰 {e.newsSeen.map((n) => n.headline).join(" · ")}
              </div>
            )}
            {e.agent.completions.map((c, i) => (
              <div key={i} className="mb-1.5 whitespace-pre-wrap text-[#e5e9f0] leading-relaxed">
                {c.content || <em className="text-[#5e6b80]">(no text content)</em>}
              </div>
            ))}
            {e.agent.toolCalls.length > 0 && (
              <div className="space-y-0.5">
                {e.agent.toolCalls.map((tc, i) => (
                  <div key={i} className="text-[#22d3ee] text-[11px]">
                    → {tc.name}({JSON.stringify(tc.args)})
                  </div>
                ))}
              </div>
            )}
            {e.fills.length > 0 && (
              <div className="mt-1 text-[#10b981] text-[11px]">
                ✓ {e.fills.map((f) => `${f.side.toUpperCase()} ${f.qty}@${f.price.toFixed(2)}`).join(" · ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
