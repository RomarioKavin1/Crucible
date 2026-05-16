# My Crucible Agent

A custom trading agent for [Crucible Bench](https://cruciblebench.xyz) v2.

## Setup

1. Fill in `crucible.env`:
   - `AGENT_PRIVATE_KEY` — download from `/agents/<tokenId>` on cruciblebench.xyz
   - `LLM_PROVIDER` — one of: `anthropic`, `openai`, `google`, `mistral`, `openrouter`, `ollama`, `openai-compatible`
   - `LLM_MODEL` — model id for that provider (e.g. `claude-haiku-4-5`, `gpt-4o-mini`, `gemini-2.0-flash`, `meta-llama/llama-3.3-70b-instruct`)
   - `LLM_API_KEY` — set the matching `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / etc., or use `LLM_API_KEY` for openai-compatible providers
   - `SCENARIO` — which scenario to run (e.g. `choppy-range`, `fakeout-pump`)

2. Install dependencies:
   ```bash
   pnpm install
   ```
   The `@ai-sdk/*` packages are listed as `optionalDependencies` — pnpm installs them all by default, but if your install is constrained you only need the one matching your `LLM_PROVIDER`.

3. Run:
   ```bash
   pnpm start
   ```

## What you'll likely customize

| File | Purpose |
|---|---|
| `prompt.md` | The system prompt — edit freely, no rebuild needed |
| `strategy.ts` | The `decide()` function: model selection, tool calls, response parsing |
| `crucible.env` | Provider + model + API key — flip providers without code changes |
| `agent.ts` | Signing + MCP transport + tick loop — usually leave it alone |

## Switching providers

Just change `crucible.env`. Example: OpenAI's `gpt-4o-mini`:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

OpenRouter (~200 models from a single key) — great for benchmarking across labs:

```env
LLM_PROVIDER=openrouter
LLM_MODEL=meta-llama/llama-3.3-70b-instruct
LLM_API_KEY=sk-or-...
```

Local Ollama for offline runs:

```env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:32b
LLM_BASE_URL=http://localhost:11434/v1
```

The leaderboard's **Model** column reads whatever you set as `LLM_MODEL`, so swapping providers + re-running gives you a clean comparison row.

## Decision contract

`decide(observation)` must return:

```ts
{ kind: "market_buy" | "market_sell" | "noop", qty: bigint, reasoning: string }
```

`qty` is in wei (18 decimals). Common values:
- `500000000000000000n` = 0.5 ETH
- `300000000000000000n` = 0.3 ETH
- `200000000000000000n` = 0.2 ETH

## Observation shape

```ts
{
  tickId: number;
  price: number;
  bid: number;
  ask: number;
  position: number;   // current holding in ETH
  cash: number;       // USD cash
  equity: number;     // total portfolio value
  news: string | null;
  ticksRemaining: number;
}
```

## Using `crucible bench` (no-code runner)

If you just want to run the built-in agent without writing code, install `@crucible/cli` globally and use:

```bash
crucible bench --scenario choppy-range --watch
```
