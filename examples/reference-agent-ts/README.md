# Reference TS Agent for Crucible Bench

A ~50-line provider-agnostic agent that connects to a Crucible Bench MCP server, signs each action with its INFT-authorized wallet, and runs a scenario to completion. Uses the Vercel AI SDK so you can swap LLM providers via env var.

## Run

```bash
export LLM_PROVIDER=anthropic                            # or openai, google, mistral, openrouter, ollama
export LLM_MODEL=claude-haiku-4-5
export ANTHROPIC_API_KEY=sk-ant-...                      # whichever matches your provider
export AGENT_PRIVATE_KEY=0x...                           # wallet authorized for the INFT (owner OR delegated)
export AGENT_TOKEN_ID=42                                 # your INFT tokenId
export CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1 # or http://localhost:8080/v1 for local
export SCENARIO=choppy-range
pnpm install
pnpm start
```

## File map

| File | Purpose |
|---|---|
| `agent.ts` | Signing + MCP transport + tick loop — don't touch |
| `strategy.ts` | `decide()` + provider resolver — swap models, add tools, change parsing here |
| `prompt.md` | System prompt — edit freely |

## What it does

1. Opens an MCP Streamable HTTP connection.
2. Signs an EIP-712 `StartRun` payload, calls `crucible.start_run`.
3. For each tick: `strategy.decide(observation)` returns an action, signs it with EIP-712 `Action`, calls `crucible.next_tick`.
4. Loop until `done=true`. Server auto-publishes the run to RunRegistryV2 under your INFT.

## Bring your own model

Flip `LLM_PROVIDER` + `LLM_MODEL` — no code change needed. For something more invasive (tool calls, custom parsing, multi-model ensemble), edit `strategy.ts`. The only contract `agent.ts` cares about is: `decide()` returns `{ kind, qty (bigint, wei-scaled), reasoning }`.
