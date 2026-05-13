"use client";
import { useEffect, useRef } from "react";
import type { TraceEntry } from "@crucible/core";

export interface AgentReasoningStreamProps {
  entries: TraceEntry[];
  /** Highlight this tick with a pulsing cyan left-border. */
  highlightTick?: number;
  /** Reverse chronological order — newest at top. Default false. */
  newestFirst?: boolean;
  maxHeight?: number;
  /** Strip outer bg/border/padding so the component can be embedded in a parent panel. */
  bare?: boolean;
  /** When true, scroll the highlighted tick into view as it changes (playback mode). */
  autoScrollToHighlight?: boolean;
}

export function AgentReasoningStream({
  entries, highlightTick, newestFirst = false, maxHeight = 600, bare = false,
  autoScrollToHighlight = false,
}: AgentReasoningStreamProps) {
  const ordered = newestFirst ? [...entries].reverse() : entries;
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScrollToHighlight || highlightTick === undefined) return;
    const el = highlightRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    // Scroll within the container so the highlighted tick is centered-ish
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    const containerHeight = container.clientHeight;
    container.scrollTo({
      top: elTop - containerHeight / 2 + elHeight / 2,
      behavior: "smooth",
    });
  }, [highlightTick, autoScrollToHighlight]);

  return (
    <div
      ref={containerRef}
      style={bare ? { height: "100%", overflowY: "auto" } : { maxHeight, overflowY: "auto" }}
      className={
        bare
          ? "space-y-3 text-[13px] px-4 py-3"
          : "space-y-3 text-[13px] bg-[#0f1623] border border-[#1c2538] rounded-xl px-4 py-3"
      }
    >
      {ordered.map((e) => {
        const isHighlight = e.tick === highlightTick;
        const hasNews = e.newsSeen.length > 0;
        return (
          <div
            key={e.tick}
            ref={isHighlight ? highlightRef : undefined}
            className={`p-3 rounded-lg border-l-2 transition-colors ${
              isHighlight
                ? "border-l-[#22d3ee] bg-[#22d3ee0a] shadow-[inset_0_0_0_1px_#22d3ee33]"
                : hasNews
                ? "border-l-[#fbbf24] bg-[#fbbf240a]"
                : "border-l-[#1c2538] hover:bg-[#ffffff03]"
            }`}
          >
            <div className="flex items-center gap-2.5 text-[11px] text-[#6b7691] mb-1.5">
              <span className="font-mono text-[#aab2c5]">tick {e.tick}</span>
              <span className="h-3 w-px bg-[#1c2538]" />
              <span className="font-mono">{e.ts}</span>
              {isHighlight && (
                <span className="ml-auto flex items-center gap-1.5 text-[#22d3ee]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22d3ee]" />
                  </span>
                  Now
                </span>
              )}
            </div>
            {hasNews && (
              <div className="mb-2 text-[#fbbf24] text-[12px] flex items-start gap-1.5">
                <span aria-hidden>📰</span>
                <span>{e.newsSeen.map((n) => n.headline).join(" · ")}</span>
              </div>
            )}
            {e.agent.completions.map((c, i) => (
              <div key={i} className="mb-2 last:mb-0 whitespace-pre-wrap text-[#e6e9f0] leading-[1.55] text-[13px]">
                {c.content || <em className="text-[#6b7691]">(no text content)</em>}
              </div>
            ))}
            {e.agent.toolCalls.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {e.agent.toolCalls.map((tc, i) => (
                  <div key={i} className="font-mono text-[11px] text-[#22d3ee]">
                    → {tc.name}({JSON.stringify(tc.args)})
                  </div>
                ))}
              </div>
            )}
            {e.fills.length > 0 && (
              <div className="mt-2 font-mono text-[11px] text-[#10b981]">
                ✓ {e.fills.map((f) => `${f.side.toUpperCase()} ${f.qty}@${f.price.toFixed(2)}`).join(" · ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
