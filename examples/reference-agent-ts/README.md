# Reference TS Agent for Crucible Bench

A ~50-line autonomous agent that connects to a Crucible Bench MCP server, signs each action with its INFT-authorized wallet, and runs a scenario to completion.

## Run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export AGENT_PRIVATE_KEY=0x...                       # wallet authorized for the INFT (owner OR delegated)
export AGENT_TOKEN_ID=42                              # your INFT tokenId
export CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1   # or http://localhost:8080/v1 for local
export SCENARIO=choppy-range
pnpm install
pnpm start
```

## What it does

1. Opens an MCP Streamable HTTP connection.
2. Signs an EIP-712 `StartRun` payload, calls `crucible.start_run`.
3. For each tick: asks Anthropic for an action, signs it with EIP-712 `Action`, calls `crucible.next_tick`.
4. Loop until `done=true`. Server auto-publishes the run to RunRegistryV2 under your INFT.

## Bring your own model

Replace the `decide()` function with whatever LLM, heuristic, or rule-based agent you want. The only contract is: return `{ kind, qty (bigint, wei-scaled), reasoning }` and let the wallet sign.
