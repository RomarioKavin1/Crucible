// strategy.ts — your trading brain.
//
// Edit `prompt.md` to change the system prompt without touching code.
// Edit `decide()` to swap the model, add tools, change parsing, etc.
// Set LLM_PROVIDER and LLM_MODEL in crucible.env to pick any provider —
// no code change needed for simple model swaps.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateText, type LanguageModel } from "ai";

export type AgentDecision = { kind: string; qty: bigint; reasoning: string };

export const meta = {
  model:        process.env["LLM_MODEL"]    ?? "claude-haiku-4-5",
  framework:    process.env["LLM_FRAMEWORK"] ?? "vercel-ai-sdk",
  agentVersion: process.env["AGENT_VERSION"] ?? "0.1.0",
};

const SYSTEM_PROMPT = readFileSync(resolve(process.cwd(), "prompt.md"), "utf8");

// Lazy-resolve the provider so users only need to install the SDK they use.
async function resolveModel(): Promise<LanguageModel> {
  const provider = (process.env["LLM_PROVIDER"] ?? "anthropic").toLowerCase();
  const model    = process.env["LLM_MODEL"] ?? "claude-haiku-4-5";

  switch (provider) {
    case "anthropic": {
      const { anthropic } = await import("@ai-sdk/anthropic");
      return anthropic(model);
    }
    case "openai": {
      const { openai } = await import("@ai-sdk/openai");
      return openai(model);
    }
    case "google": {
      const { google } = await import("@ai-sdk/google");
      return google(model);
    }
    case "mistral": {
      const { mistral } = await import("@ai-sdk/mistral");
      return mistral(model);
    }
    case "openrouter":
    case "openai-compatible":
    case "ollama": {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      const baseURL = process.env["LLM_BASE_URL"] ??
        (provider === "openrouter" ? "https://openrouter.ai/api/v1"
         : provider === "ollama"    ? "http://localhost:11434/v1"
         : (() => { throw new Error("LLM_BASE_URL required for openai-compatible"); })());
      const apiKey = process.env["LLM_API_KEY"] ?? process.env["OPENROUTER_API_KEY"] ?? "not-needed";
      const client = createOpenAICompatible({ name: provider, baseURL, apiKey });
      return client(model);
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER "${provider}". Supported: anthropic, openai, google, mistral, openrouter, ollama, openai-compatible.`);
  }
}

let _model: LanguageModel | undefined;
async function model(): Promise<LanguageModel> {
  if (!_model) _model = await resolveModel();
  return _model;
}

export async function decide(observation: Record<string, unknown>): Promise<AgentDecision> {
  const { text } = await generateText({
    model: await model(),
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(observation),
    maxOutputTokens: 256,
  });

  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
  const j = JSON.parse(cleaned) as { kind: string; qty?: string; reasoning?: string };
  return { kind: j.kind, qty: BigInt(j.qty ?? "0"), reasoning: j.reasoning ?? "" };
}
