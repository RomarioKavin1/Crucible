// llm.ts — provider-agnostic LLM wiring for crucible-bench.
//
// One const-array drives both the static type (Provider) and Commander's
// runtime --provider validation, so they can never drift.
import { generateText, type LanguageModel } from "ai";

export const PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "mistral",
  "openrouter",
  "ollama",
  "openai-compatible",
] as const;

export type Provider = (typeof PROVIDERS)[number];

export type LlmConfig = {
  provider: Provider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

export const DEFAULT_PROMPT = `You are an active trader on a 150-tick benchmark scenario. **You MUST trade actively** — sitting at zero position the whole run wastes the benchmark.

Each tick you receive: { tickId, price, bid, ask, position, cash, equity, news, ticksRemaining }.

Rules:
- If position == 0 and you have cash, OPEN a long position with kind=market_buy, qty="500000000000000000" (= 0.5 ETH in wei) within the first 5 ticks.
- On sharp drops (price falls >2% over recent ticks), market_buy more at qty "300000000000000000" (0.3).
- On sharp rallies (price up >3%), market_sell qty "200000000000000000" (0.2) to take partial profit.
- React to news: bullish news → buy more, bearish news → sell.
- In the LAST 5 ticks (ticksRemaining < 6): market_sell your entire current position to lock in PnL.
- Otherwise noop is acceptable but rare — don't sit idle for more than 5 ticks at a time.

Reply with ONLY raw JSON, no prose, no markdown:
{"kind":"market_buy"|"market_sell"|"noop","qty":"<wei-string>","reasoning":"one short sentence"}`;

const DEFAULT_BASE_URL: Partial<Record<Provider, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434/v1",
};

const PROVIDER_ENV_KEY: Partial<Record<Provider, string>> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

/** Resolve the API key for a provider, preferring an explicit flag value. */
export function resolveApiKey(provider: Provider, flagValue: string | undefined): string | undefined {
  if (flagValue) return flagValue;
  if (process.env["LLM_API_KEY"]) return process.env["LLM_API_KEY"];
  const envName = PROVIDER_ENV_KEY[provider];
  if (envName && process.env[envName]) return process.env[envName];
  if (process.env["OPENROUTER_API_KEY"] && provider === "openrouter")
    return process.env["OPENROUTER_API_KEY"];
  return undefined;
}

/** True if the provider requires an API key to call (ollama doesn't). */
export function requiresApiKey(provider: Provider): boolean {
  return provider !== "ollama";
}

async function buildModel(cfg: LlmConfig): Promise<LanguageModel> {
  switch (cfg.provider) {
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const anthropic = createAnthropic(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      return anthropic(cfg.model);
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      return openai(cfg.model);
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const google = createGoogleGenerativeAI(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      return google(cfg.model);
    }
    case "mistral": {
      const { createMistral } = await import("@ai-sdk/mistral");
      const mistral = createMistral(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      return mistral(cfg.model);
    }
    case "openrouter":
    case "ollama":
    case "openai-compatible": {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      const baseURL = cfg.baseUrl ?? DEFAULT_BASE_URL[cfg.provider];
      if (!baseURL) {
        throw new Error(`--llm-base-url is required for provider "${cfg.provider}".`);
      }
      const client = createOpenAICompatible({
        name: cfg.provider,
        baseURL,
        apiKey: cfg.apiKey ?? "not-needed",
      });
      return client(cfg.model);
    }
  }
}

export type AgentDecision = { kind: string; qty: bigint; reasoning: string };

export function createDecider(cfg: LlmConfig, systemPrompt: string) {
  let _model: LanguageModel | undefined;

  return async function decide(
    observation: Record<string, unknown>
  ): Promise<AgentDecision> {
    if (!_model) _model = await buildModel(cfg);

    const { text } = await generateText({
      model: _model,
      system: systemPrompt,
      prompt: JSON.stringify(observation),
      maxOutputTokens: 256,
    });

    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
    const j = JSON.parse(cleaned) as { kind: string; qty?: string; reasoning?: string };
    return {
      kind: j.kind,
      qty: BigInt(j.qty ?? "0"),
      reasoning: j.reasoning ?? "",
    };
  };
}

/** Friendlier error than a raw "Cannot find module @ai-sdk/openai". */
export function explainMissingSdk(provider: Provider, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Cannot find module") || msg.includes("ERR_MODULE_NOT_FOUND")) {
    const pkg =
      provider === "openrouter" || provider === "ollama" || provider === "openai-compatible"
        ? "@ai-sdk/openai-compatible"
        : `@ai-sdk/${provider}`;
    return `Provider "${provider}" needs the ${pkg} package. Install it: npm i ${pkg}`;
  }
  return msg;
}
