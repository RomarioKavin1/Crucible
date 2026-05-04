// 0G Compute Router — OpenAI-compatible endpoint. Used by the AI Coach.
//
// Future: TeeML path for Compete-mode sealed execution.

export interface ComputeClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel?: string;
}

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
}

export class ComputeRouterClient {
  constructor(private readonly opts: ComputeClientOptions) {}

  async chat(args: {
    model?: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const model = args.model ?? this.opts.defaultModel ?? "gpt-4o-mini";
    const res = await fetch(`${this.opts.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: args.messages,
        temperature: args.temperature ?? 0.2,
      }),
    });
    if (!res.ok) {
      throw new Error(`0G Compute Router error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      content: data.choices[0]?.message.content ?? "",
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    };
  }
}
