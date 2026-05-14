import { describe, it, expect } from "vitest";
import { renderReport } from "../src/render.js";
import type { CoachReport } from "../src/types.js";

const sample: CoachReport = {
  runId: "test-run-1",
  scenarioId: "scenario-1",
  recipeName: "agent-A",
  scorecard: { sortino: 0.31, maxDrawdownPct: -0.184, totalReturnPct: -0.121, winRate: 0.4 },
  tradeCritiques: [],
  decisionCritiques: [],
  patternsDetected: [{
    patternId: "PANIC_SELLER",
    confidence: "high",
    evidence: ["tick 2: panic sold"],
    remediation: "Don't panic sell.",
  }],
  topSuggestions: [{
    rank: 1,
    title: "Stop panic selling",
    impact: "high",
    rationale: "Detected with high confidence.",
    promptEditSuggestion: "Add to system prompt: do not panic sell.",
    verificationStep: "Re-run scenario, expect higher Sortino.",
  }],
  rawTrace: [],
};

describe("renderReport", () => {
  it("renders a coach report as markdown", () => {
    const md = renderReport(sample);
    expect(md).toContain("# Coach Report");
    expect(md).toContain("agent-A");
    expect(md).toContain("PANIC_SELLER");
    expect(md).toContain("Stop panic selling");
    expect(md).toContain("Top 1 issues");  // floor(min(3, len)) — sample has 1 suggestion
  });
});
