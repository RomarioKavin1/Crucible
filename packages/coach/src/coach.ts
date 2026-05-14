import { loadRun } from "./trace-reader";
import { computeTradeCritiques } from "./trade-critique";
import { detectPatterns } from "./pattern-detect";
import { selectDecisionPoints, critiqueDecisionPoints } from "./decision-critique";
import { synthesize } from "./synthesis";
import { renderReport } from "./render";
import { loadOgLlmFromEnv, type OgLlmClient } from "./og-llm-client";
import type { CoachReport } from "./types";

export interface CoachOpts {
  runDir: string;
  llm?: OgLlmClient;
  systemPromptForContext?: string;
}

export async function runCoach(opts: CoachOpts): Promise<{ report: CoachReport; markdown: string }> {
  const run = await loadRun(opts.runDir);
  const llm = opts.llm ?? loadOgLlmFromEnv();

  const tradeCritiques = computeTradeCritiques(run.entries);
  const patterns = detectPatterns(run.entries);

  const decisionPoints = selectDecisionPoints(run.entries, 8);
  const decisionCritiques = await critiqueDecisionPoints(llm, decisionPoints);

  const suggestions = await synthesize(
    llm,
    tradeCritiques,
    decisionCritiques,
    patterns,
    opts.systemPromptForContext
  );

  const report: CoachReport = {
    runId: opts.runDir.split("/").pop() ?? "unknown",
    scenarioId: run.scenarioId,
    recipeName: run.recipeName,
    scorecard: run.scorecard.scorecard,
    tradeCritiques,
    decisionCritiques,
    patternsDetected: patterns,
    topSuggestions: suggestions,
    rawTrace: run.entries,
  };

  return { report, markdown: renderReport(report) };
}
