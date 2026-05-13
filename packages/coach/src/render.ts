import type { CoachReport } from "./types.js";

export function renderReport(r: CoachReport): string {
  const lines: string[] = [];
  lines.push(`# Coach Report`);
  lines.push("");
  lines.push(`**Run:** \`${r.runId}\``);
  lines.push(`**Scenario:** \`${r.scenarioId}\``);
  lines.push(`**Recipe:** \`${r.recipeName}\``);
  lines.push("");
  lines.push(`## Scorecard`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Sortino | ${r.scorecard.sortino.toFixed(4)} |`);
  lines.push(`| Max drawdown | ${(Math.abs(r.scorecard.maxDrawdownPct) * 100).toFixed(2)}% |`);
  lines.push(`| Total return | ${(r.scorecard.totalReturnPct * 100).toFixed(2)}% |`);
  lines.push(`| Win rate | ${(r.scorecard.winRate * 100).toFixed(1)}% |`);
  lines.push("");
  lines.push(`## Top ${Math.min(3, r.topSuggestions.length)} issues`);
  lines.push("");
  for (const s of r.topSuggestions.slice(0, 3)) {
    lines.push(`### ${s.rank}. ${s.title} *(${s.impact} impact)*`);
    lines.push("");
    lines.push(s.rationale);
    if (s.promptEditSuggestion) {
      lines.push("");
      lines.push(`**Suggested prompt edit:**`);
      lines.push("");
      lines.push("```");
      lines.push(s.promptEditSuggestion);
      lines.push("```");
    }
    lines.push("");
    lines.push(`**Verify:** ${s.verificationStep}`);
    lines.push("");
  }
  if (r.patternsDetected.length > 0) {
    lines.push(`## Patterns detected`);
    lines.push("");
    for (const p of r.patternsDetected) {
      lines.push(`### ${p.patternId} *(confidence: ${p.confidence})*`);
      lines.push("");
      for (const e of p.evidence) lines.push(`- ${e}`);
      lines.push("");
      lines.push(`**Remediation:** ${p.remediation}`);
      lines.push("");
    }
  }
  if (r.decisionCritiques.length > 0) {
    lines.push(`## Decision-by-decision critique`);
    lines.push("");
    for (const d of r.decisionCritiques) {
      lines.push(`### Tick ${d.tick}`);
      lines.push("");
      lines.push(d.critique);
      lines.push("");
      lines.push(`**Recommendation:** ${d.recommendation}`);
      lines.push("");
    }
  }
  if (r.tradeCritiques.length > 0) {
    lines.push(`## Trade observations`);
    lines.push("");
    for (const t of r.tradeCritiques) {
      lines.push(`- ${t.observation}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
