import OpenAI from "openai";

export interface OgLlmConfig {
  baseURL: string;            // e.g., https://router-api.0g.ai/v1 (mainnet)
  apiKey: string;             // 0G Compute Router API key starting with "sk-"
  model: string;              // e.g., "zai-org/GLM-5-FP8"
}

export class OgLlmClient {
  private client: OpenAI;
  constructor(private readonly cfg: OgLlmConfig) {
    this.client = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey });
  }

  async complete(systemPrompt: string, userPrompt: string, options?: {
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  }): Promise<string> {
    const resp = await this.client.chat.completions.create({
      model: this.cfg.model,
      max_tokens: options?.maxTokens ?? 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
    });
    return resp.choices[0]?.message?.content ?? "";
  }
}

/**
 * Construct from env vars.
 *
 * Verified endpoints (from docs.0g.ai, May 2026):
 *   - Mainnet:  https://router-api.0g.ai/v1
 *   - Testnet:  https://router-api-testnet.integratenetwork.work/v1
 *
 * API key is created at pc.0g.ai → Dashboard → API Keys (with "inference"
 * permission). It starts with "sk-".
 *
 * Browse the live model catalog (no auth):
 *   curl https://router-api.0g.ai/v1/models
 *
 * Default model uses one currently in the catalog; verify yours via the
 * catalog before relying on it.
 */
export function loadOgLlmFromEnv(): OgLlmClient {
  const baseURL = process.env["OG_COMPUTE_BASE_URL"] ?? "https://router-api.0g.ai/v1";
  const apiKey = process.env["OG_COMPUTE_API_KEY"];
  const model = process.env["OG_COMPUTE_MODEL"] ?? "zai-org/GLM-5-FP8";
  if (!apiKey) throw new Error("Missing OG_COMPUTE_API_KEY env var (get one at pc.0g.ai)");
  return new OgLlmClient({ baseURL, apiKey, model });
}
