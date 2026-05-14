import type { TraceEntry } from "@crucible/core";

/** A single trade-level critique entry */
export interface TradeCritique {
  tick: number;
  ts: string;
  side: "buy" | "sell";
  qty: number;
  fillPrice: number;
  counterfactualHold: {
    untilTick: number;
    untilPrice: number;
    pnlIfHeld: number;
  };
  observation: string;
}

/** A consequential decision point flagged for LLM critique */
export interface DecisionPoint {
  tick: number;
  ts: string;
  reason: "largest_pnl_delta" | "regime_shift" | "news_arrival";
  pnlDelta: number;
  agentReasoning: string;
  marketContext: string;
}

/** A decision-point critique from the LLM */
export interface DecisionCritique {
  tick: number;
  critique: string;
  recommendation: string;
}

/** A detected behavioral pattern from the failure-mode library */
export interface PatternDetection {
  patternId: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  remediation: string;
}

/** The final synthesized recommendation */
export interface CoachSuggestion {
  rank: number;
  title: string;
  impact: "high" | "medium" | "low";
  rationale: string;
  promptEditSuggestion?: string;
  verificationStep: string;
}

/** Full coach report */
export interface CoachReport {
  runId: string;
  scenarioId: string;
  recipeName: string;
  scorecard: {
    sortino: number;
    maxDrawdownPct: number;
    totalReturnPct: number;
    winRate: number;
  };
  tradeCritiques: TradeCritique[];
  decisionCritiques: DecisionCritique[];
  patternsDetected: PatternDetection[];
  topSuggestions: CoachSuggestion[];
  rawTrace: TraceEntry[];
}
