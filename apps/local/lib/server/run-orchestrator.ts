import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { JsonlFileRecorder, ScenarioEngine, loadScenario, type TraceEntry } from "@crucible/core";
import { SkillRuntime, SKILL_DEFINITIONS } from "@crucible/skills";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentCompletion, AgentStepRecord, AgentToolCall, MarketSnapshot } from "@crucible/core";
import { registerActiveRun, emitActiveRunUpdate, getActiveRun } from "./run-store";

// Inlined recipe schema (avoids cross-app import dependency on @crucible/cli)
const RecipeSchema = z.object({
  name: z.string().min(1),
  model: z.object({
    provider: z.enum(["anthropic"]),
    id: z.string().min(1),
    api_key_env: z.string().min(1),
  }),
  system_prompt: z.string().min(1),
  budgets: z.object({
    llm_completions_per_tick: z.number().int().positive(),
    tool_calls_per_tick: z.number().int().positive(),
  }),
});
type Recipe = z.infer<typeof RecipeSchema>;

async function loadRecipe(filePath: string): Promise<Recipe> {
  const raw = await readFile(filePath, "utf8");
  return RecipeSchema.parse(yaml.load(raw));
}

function makeAnthropicAgent(recipe: Recipe) {
  const apiKey = process.env[recipe.model.api_key_env];
  if (!apiKey) throw new Error(`Missing env var ${recipe.model.api_key_env}`);
  const client = new Anthropic({ apiKey });
  const tools = SKILL_DEFINITIONS.map((d) => ({
    name: d.name,
    description: d.description,
    input_schema: d.parameters as unknown as Record<string, unknown>,
  }));

  return async (snapshot: MarketSnapshot, runtime: SkillRuntime): Promise<AgentStepRecord> => {
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
    while (llmCalls < recipe.budgets.llm_completions_per_tick && tCalls < recipe.budgets.tool_calls_per_tick) {
      const resp = await client.messages.create({
        model: recipe.model.id, max_tokens: 1024,
        system: recipe.system_prompt,
        tools: tools as Anthropic.Tool[], messages,
      });
      llmCalls++;
      const textBlocks = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
      completions.push({
        model: recipe.model.id,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        content: textBlocks,
      });
      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0 || resp.stop_reason === "end_turn") break;
      messages.push({ role: "assistant", content: resp.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tCalls >= recipe.budgets.tool_calls_per_tick) break;
        try {
          const result = await runtime.execute(tu.name, tu.input);
          toolCalls.push({ name: tu.name, args: tu.input as Record<string, unknown>, result });
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toolCalls.push({ name: tu.name, args: tu.input as Record<string, unknown>, result: { error: msg } });
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: `error: ${msg}`, is_error: true });
        }
        tCalls++;
      }
      messages.push({ role: "user", content: toolResults });
    }
    return { completions, toolCalls };
  };
}

export interface StartRunOpts {
  scenarioDir: string;
  recipePath: string;
  outDir: string;
}

export async function startRunBackground(opts: StartRunOpts): Promise<string> {
  const scenario = await loadScenario(opts.scenarioDir);
  const recipe = await loadRecipe(opts.recipePath);
  const runId = `${recipe.name}_${scenario.manifest.id}_${Date.now()}`;
  const runDir = path.join(opts.outDir, runId);
  await mkdir(runDir, { recursive: true });
  const recorder = new JsonlFileRecorder(path.join(runDir, "trace.jsonl"));

  registerActiveRun(runId, {
    ticks: scenario.ticks,
    entries: [],
    state: "running",
    scenarioId: scenario.manifest.id,
    recipeName: recipe.name,
  });

  const wrappedRecorder = {
    append: async (e: TraceEntry) => {
      await recorder.append(e);
      const run = getActiveRun(runId);
      if (run) {
        run.entries.push(e);
        emitActiveRunUpdate(runId);
      }
    },
    close: () => recorder.close(),
  };

  const engine = new ScenarioEngine(scenario, wrappedRecorder);
  const runtime = new SkillRuntime(engine.getEngineHandle());
  const agentStep = makeAnthropicAgent(recipe);

  void (async () => {
    try {
      const result = await engine.run((snap) => agentStep(snap, runtime));
      await writeFile(
        path.join(runDir, "scorecard.json"),
        JSON.stringify({ scenario: scenario.manifest.id, recipe: recipe.name, ...result }, null, 2)
      );
      const run = getActiveRun(runId);
      if (run) { run.state = "complete"; emitActiveRunUpdate(runId); }
    } catch (err) {
      const run = getActiveRun(runId);
      if (run) {
        run.state = "error";
        run.error = err instanceof Error ? err.message : String(err);
        emitActiveRunUpdate(runId);
      }
      await recorder.close().catch(() => {});
    }
  })();

  return runId;
}
