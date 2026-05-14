import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentCompletion,
  AgentStepRecord,
  AgentToolCall,
  MarketSnapshot,
} from "@crucible/core";
import { SKILL_DEFINITIONS, type SkillRuntime } from "@crucible/skills";
import type { Recipe } from "./recipe";

export function makeAnthropicAgent(recipe: Recipe) {
  const apiKey = process.env[recipe.model.api_key_env];
  if (!apiKey) {
    throw new Error(`Missing env var ${recipe.model.api_key_env}`);
  }
  const client = new Anthropic({ apiKey });

  const tools = SKILL_DEFINITIONS.map((d: (typeof SKILL_DEFINITIONS)[number]) => ({
    name: d.name,
    description: d.description,
    input_schema: d.parameters as unknown as Record<string, unknown>,
  }));

  const stepFn = async (
    snapshot: MarketSnapshot,
    runtime: SkillRuntime
  ): Promise<AgentStepRecord> => {
    const completions: AgentCompletion[] = [];
    const toolCalls: AgentToolCall[] = [];

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Tick ${snapshot.tick} @ ${snapshot.ts}\n` +
          `Market: ${JSON.stringify(snapshot.market)}\n` +
          `Position: ${snapshot.portfolio.position}, Cash: ${snapshot.portfolio.cash.toFixed(2)}, ` +
          `Drawdown: ${(snapshot.portfolio.drawdownPct * 100).toFixed(2)}%\n` +
          `News this tick: ${snapshot.newsSinceLastTick.length === 0 ? "(none)" : JSON.stringify(snapshot.newsSinceLastTick)}\n` +
          `Decide your next action. Use tools as needed. End your turn with a final message.`,
      },
    ];

    let llmCalls = 0;
    let tCalls = 0;

    while (
      llmCalls < recipe.budgets.llm_completions_per_tick &&
      tCalls < recipe.budgets.tool_calls_per_tick
    ) {
      const resp = await client.messages.create({
        model: recipe.model.id,
        max_tokens: 1024,
        system: recipe.system_prompt,
        tools: tools as Anthropic.Tool[],
        messages,
      });
      llmCalls++;

      const textBlocks = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      completions.push({
        model: recipe.model.id,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        content: textBlocks,
      });

      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0 || resp.stop_reason === "end_turn") break;

      messages.push({ role: "assistant", content: resp.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        if (tCalls >= recipe.budgets.tool_calls_per_tick) break;
        try {
          const result = await runtime.execute(tu.name, tu.input);
          toolCalls.push({ name: tu.name, args: tu.input as Record<string, unknown>, result });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toolCalls.push({ name: tu.name, args: tu.input as Record<string, unknown>, result: { error: msg } });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `error: ${msg}`,
            is_error: true,
          });
        }
        tCalls++;
      }

      messages.push({ role: "user", content: toolResults });
    }

    return { completions, toolCalls };
  };

  return stepFn;
}
