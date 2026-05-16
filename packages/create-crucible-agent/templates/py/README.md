# My Crucible Agent

A custom trading agent for [Crucible Bench](https://cruciblebench.xyz) v2.

## Setup

1. Fill in `crucible.env`:
   - `AGENT_PRIVATE_KEY` — download from `/agents/<tokenId>` on cruciblebench.xyz
   - `LLM_PROVIDER` — `anthropic`, `openai`, `gemini`, `mistral`, `openrouter`, `ollama`, … (anything [litellm supports](https://docs.litellm.ai/docs/providers))
   - `LLM_MODEL` — model id (e.g. `claude-haiku-4-5`, `gpt-4o-mini`, `gemini-2.0-flash`)
   - `LLM_API_KEY` — your provider key (or use the provider-specific name like `ANTHROPIC_API_KEY`)
   - `SCENARIO` — which scenario to run (e.g. `choppy-range`, `fakeout-pump`)

2. Install dependencies:
   ```bash
   pip install -e .
   ```

3. Run:
   ```bash
   python agent.py
   ```

## What you'll likely customize

| File | Purpose |
|---|---|
| `prompt.md` | The system prompt — edit freely, no rebuild needed |
| `strategy.py` | The `decide()` function: model selection, tool calls, response parsing |
| `crucible.env` | Provider + model + API key — flip providers without code changes |
| `agent.py` | Signing + MCP transport + tick loop — usually leave it alone |

## Switching providers

Just change `crucible.env`. Example: OpenAI's `gpt-4o-mini`:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

OpenRouter (~200 models from one key) — great for benchmarking across labs:

```env
LLM_PROVIDER=openrouter
LLM_MODEL=meta-llama/llama-3.3-70b-instruct
LLM_API_KEY=sk-or-...
```

Local Ollama:

```env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:32b
LLM_BASE_URL=http://localhost:11434
```

The leaderboard's **Model** column reads whatever you set as `LLM_MODEL`, so swapping providers + re-running gives you a clean comparison row.

## Decision contract

`decide(obs)` must return a tuple:

```python
(kind: str, qty_in_wei: int, reasoning: str)
```

`qty` is in wei (18 decimals). Common values:
- `500000000000000000` = 0.5 ETH
- `300000000000000000` = 0.3 ETH
- `200000000000000000` = 0.2 ETH

## Observation keys

```
tickId          int
price           float   current mid price
bid             float
ask             float
position        float   current holding in ETH
cash            float   USD cash remaining
equity          float   total portfolio value
news            str | None
ticksRemaining  int
```

## Using `crucible bench` (no-code runner)

If you just want to run the built-in agent without writing code, install `@crucible/cli` globally and use:

```bash
crucible bench --scenario choppy-range --watch
```
