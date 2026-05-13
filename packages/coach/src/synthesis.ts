import { z } from "zod";
import type { OgLlmClient } from "./og-llm-client.js";
import type { TradeCritique, DecisionCritique, PatternDetection, CoachSuggestion } from "./types.js";

const SuggestionSchema = z.object({
  rank: z.number().int().min(1),
  title: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  rationale: z.string(),
  promptEditSuggestion: z.string().optional(),
  verificationStep: z.string(),
});
const SuggestionsSchema = z.object({ suggestions: z.array(SuggestionSchema) });

const SYSTEM_PROMPT = `You are synthesizing observations into a ranked list of improvement suggestions for an AI trading agent.

Input: trade critiques, decision critiques, detected patterns, plus the agent's current system prompt (if provided).
Output strict JSON: { "suggestions": [{ "rank": 1, "title": "...", "impact": "high|medium|low", "rationale": "...", "promptEditSuggestion": "concrete text to add to system prompt", "verificationStep": "how to verify the change worked" }, ...] }

Rules:
- Top 3-5 suggestions, ranked by expected impact
- Each suggestion must be actionable and specific
- Reference evidence from the inputs (e.g., "panic seller pattern detected with high confidence")
- promptEditSuggestion should be a concrete sentence the user could paste into their system_prompt
- verificationStep should describe how to confirm the change (e.g., "re-run on scenario X, expect Sortino > 0.5")`;

export async function synthesize(
  llm: OgLlmClient,
  tradeCritiques: TradeCritique[],
  decisionCritiques: DecisionCritique[],
  patterns: PatternDetection[],
  currentSystemPrompt?: string
): Promise<CoachSuggestion[]> {
  const userPrompt = JSON.stringify(
    {
      tradeCritiques,
      decisionCritiques,
      patterns,
      currentSystemPrompt: currentSystemPrompt ?? "(not provided)",
    },
    null,
    2
  );
  const raw = await llm.complete(SYSTEM_PROMPT, userPrompt, { responseFormat: "json_object", maxTokens: 2048 });
  try {
    const parsed = SuggestionsSchema.parse(JSON.parse(raw));
    return parsed.suggestions.sort((a, b) => a.rank - b.rank);
  } catch (err) {
    return [{
      rank: 1,
      title: "(coach: synthesis failed)",
      impact: "low",
      rationale: `Raw LLM output: ${raw.slice(0, 500)}`,
      verificationStep: "Re-run coach with verbose logs.",
    }];
  }
}
