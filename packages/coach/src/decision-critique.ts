import { z } from "zod";
import type { TraceEntry } from "@crucible/core";
import type { OgLlmClient } from "./og-llm-client.js";
import type { DecisionPoint, DecisionCritique } from "./types.js";

/** Pick the 5-10 most consequential ticks by absolute PnL delta */
export function selectDecisionPoints(entries: TraceEntry[], k = 8): DecisionPoint[] {
  const ranked: { entry: TraceEntry; pnlDelta: number; reason: DecisionPoint["reason"] }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const cur = entries[i]!;
    const prev = entries[i - 1];
    const curEquity = cur.portfolio.cash + cur.portfolio.position * cur.market.last;
    const prevEquity = prev ? prev.portfolio.cash + prev.portfolio.position * prev.market.last : curEquity;
    const delta = curEquity - prevEquity;
    const reason: DecisionPoint["reason"] = cur.newsSeen.length > 0 ? "news_arrival" : "largest_pnl_delta";
    if (Math.abs(delta) > 0.001) {
      ranked.push({ entry: cur, pnlDelta: delta, reason });
    }
  }
  ranked.sort((a, b) => Math.abs(b.pnlDelta) - Math.abs(a.pnlDelta));
  return ranked.slice(0, k).map((r) => ({
    tick: r.entry.tick,
    ts: r.entry.ts,
    reason: r.reason,
    pnlDelta: r.pnlDelta,
    agentReasoning: r.entry.agent.completions.map((c) => c.content).join("\n"),
    marketContext: `mid=${r.entry.market.mid.toFixed(2)} drawdown=${(r.entry.portfolio.drawdownPct * 100).toFixed(2)}% position=${r.entry.portfolio.position}`,
  }));
}

const DecisionCritiqueSchema = z.object({
  critique: z.string(),
  recommendation: z.string(),
});

const SYSTEM_PROMPT = `You are a trading coach reviewing an AI trading agent's decisions. For each decision point, analyze:
1. What the agent reasoned about
2. What actually happened (market context, PnL impact)
3. Whether the reasoning was sound, given information available at that moment

Output strict JSON: { "critique": "<2-3 sentences>", "recommendation": "<1 sentence, actionable>" }

Phrase as observations, not commands. Reference specific evidence from the agent's own reasoning.`;

export async function critiqueDecisionPoints(
  llm: OgLlmClient,
  points: DecisionPoint[]
): Promise<DecisionCritique[]> {
  const critiques: DecisionCritique[] = [];
  for (const p of points) {
    const userPrompt = [
      `Decision point at tick ${p.tick} (${p.ts})`,
      `Reason flagged: ${p.reason}`,
      `PnL delta: ${p.pnlDelta.toFixed(2)}`,
      `Market context: ${p.marketContext}`,
      `Agent's reasoning at this tick:`,
      p.agentReasoning || "(no reasoning recorded)",
    ].join("\n");

    const raw = await llm.complete(SYSTEM_PROMPT, userPrompt, { responseFormat: "json_object", maxTokens: 512 });
    try {
      const parsed = DecisionCritiqueSchema.parse(JSON.parse(raw));
      critiques.push({ tick: p.tick, ...parsed });
    } catch {
      critiques.push({
        tick: p.tick,
        critique: `(coach: failed to parse LLM output) raw: ${raw.slice(0, 200)}`,
        recommendation: "(no recommendation)",
      });
    }
  }
  return critiques;
}
