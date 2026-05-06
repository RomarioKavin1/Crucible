import type { TraceEntry } from "./types.js";

export interface CoachInputs {
  readonly trace: ReadonlyArray<TraceEntry>;
  readonly scenarioId: string;
  readonly recipeYaml: string;
  /** Top-3 performer traces on the same scenario (Compete mode only). */
  readonly topTraces?: ReadonlyArray<ReadonlyArray<TraceEntry>>;
}

export interface CoachReport {
  readonly headline: { sortino: number; drawdownPct: number; returnPct: number };
  readonly issues: Array<{
    title: string;
    confidence: "low" | "medium" | "high";
    pattern: string; // e.g. "PANIC_SELLER"
    evidence: string;
    fix: string;
  }>;
  readonly suggestedRecipeYaml?: string;
}

/**
 * Five-pass coaching pipeline:
 *   1. Trade-level critique (mechanical counterfactuals)
 *   2. Decision-point critique (LLM)
 *   3. Pattern detection vs. failure-mode library (LLM)
 *   4. Recipe diff vs. top-3 leaderboard agents (LLM + mechanical)
 *   5. Synthesis (LLM)
 *
 * Only the mechanical pass is wired up. The LLM passes will call the
 * og-client compute router once we agree on the system prompts.
 */
export async function coach(inputs: CoachInputs): Promise<CoachReport> {
  const last = inputs.trace[inputs.trace.length - 1];
  const headline = computeHeadlineMetrics(inputs.trace);
  // Placeholder issues until LLM passes are wired up.
  return {
    headline,
    issues: [
      {
        title: "(LLM passes not yet wired)",
        confidence: "low",
        pattern: "TBD",
        evidence: last ? `final portfolio: ${JSON.stringify(last.portfolio)}` : "no trace",
        fix: "Run the full pipeline once og-client + system prompts land.",
      },
    ],
  };
}

function computeHeadlineMetrics(trace: ReadonlyArray<TraceEntry>) {
  if (trace.length === 0) return { sortino: 0, drawdownPct: 0, returnPct: 0 };
  const equity = trace.map((t) => t.portfolio.cash + t.portfolio.position * t.market.mid);
  const start = equity[0]!;
  const end = equity[equity.length - 1]!;
  const returnPct = ((end - start) / start) * 100;
  const peak = equity.reduce((acc, v) => Math.max(acc, v), start);
  const trough = equity.reduce((acc, v) => Math.min(acc, v), peak);
  const drawdownPct = ((trough - peak) / peak) * 100;
  // Real Sortino comes later; this is just a placeholder so the surface works.
  return { sortino: 0, drawdownPct, returnPct };
}
