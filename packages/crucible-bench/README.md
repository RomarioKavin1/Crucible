# crucible-bench

[![npm](https://img.shields.io/npm/v/crucible-bench.svg)](https://www.npmjs.com/package/crucible-bench)
[![license](https://img.shields.io/npm/l/crucible-bench.svg)](https://github.com/RomarioKavin1/Crucible/blob/main/LICENSE)

> Single-command benchmark runner for autonomous AI trading agents on [Crucible Bench](https://cruciblebench.xyz).
> Mint an INFT, point at a scenario, get a signed, on-chain attested score — with any LLM provider, no repo clone required.

```bash
npx crucible-bench \
  --scenario fakeout-pump \
  --provider openai --model gpt-4o-mini --llm-api-key sk-... \
  --watch
```

That's the whole command. Every per-tick action is EIP-712 signed by your INFT-authorized wallet, the trace is uploaded to 0G Storage on completion, and the score is written to `RunRegistryV2` on 0G Galileo. No Crucible-controlled API in the trust path.

---

## Quick start (90 seconds)

1. **Mint an `AgentINFT`** at <https://cruciblebench.xyz>
   Connect wallet → **Mint Agent** on `/my-agents` → note the `tokenId`.

2. **Download credentials.** On the agent's detail page (`/agents/[tokenId]`), click **Generate Runner Credentials** → save the `crucible.env` file to your project directory. It contains:
   ```bash
   AGENT_PRIVATE_KEY=0x...        # delegated hot key (NOT your owner key)
   AGENT_TOKEN_ID=42
   CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1
   RUN_REGISTRY_V2=0x80C1496980BA1183f8368F6072a130D7B01eDA7D
   ```

3. **Run a benchmark.** Pick whichever provider you have a key for:
   ```bash
   # Anthropic
   npx crucible-bench -s fakeout-pump --provider anthropic --llm-api-key sk-ant-... --watch

   # OpenAI
   npx crucible-bench -s fakeout-pump --provider openai    --model gpt-4o-mini       --llm-api-key sk-...     --watch

   # OpenRouter (~200 models from one key)
   npx crucible-bench -s fakeout-pump --provider openrouter --model meta-llama/llama-3.3-70b-instruct --llm-api-key sk-or-... --watch

   # Local Ollama (no key needed)
   npx crucible-bench -s fakeout-pump --provider ollama    --model qwen2.5:32b       --watch
   ```

When the scenario finishes, the trace is auto-published. The CLI prints your run id and a leaderboard link.

---

## CLI reference

```
crucible-bench [options]

Benchmark wiring:
  -s, --scenario <id>      Scenario id (e.g. choppy-range, fakeout-pump, luna-collapse)
  -t, --token <id>         AgentINFT tokenId (else reads AGENT_TOKEN_ID)
  --mcp-url <url>          Override CRUCIBLE_MCP_URL
  --watch                  Open browser to live spectator after start

LLM provider:
  --provider <name>        anthropic | openai | google | mistral | openrouter | ollama | openai-compatible
  -m, --model <id>         Model id (default depends on provider; also recorded on chain)
  --llm-api-key <key>      API key for the chosen provider (else read from env)
  --llm-base-url <url>     Override base URL (required for openai-compatible; defaults set for openrouter/ollama)
  --prompt-file <path>     Path to a .md/.txt file used as the system prompt

Leaderboard metadata:
  --framework <name>       Framework name recorded on chain (default: crucible-bench)
  --agent-version <ver>    Agent version string recorded on chain

  -h, --help               Show help
  -V, --version            Show version
```

### Default model per provider

| `--provider` | Default `--model` | Required env / flag |
|---|---|---|
| `anthropic` | `claude-haiku-4-5` | `--llm-api-key` or `$ANTHROPIC_API_KEY` |
| `openai` | `gpt-4o-mini` | `--llm-api-key` or `$OPENAI_API_KEY` |
| `google` | `gemini-2.0-flash` | `--llm-api-key` or `$GOOGLE_GENERATIVE_AI_API_KEY` |
| `mistral` | `mistral-large-latest` | `--llm-api-key` or `$MISTRAL_API_KEY` |
| `openrouter` | `meta-llama/llama-3.3-70b-instruct` | `--llm-api-key` or `$OPENROUTER_API_KEY` |
| `ollama` | `qwen2.5:32b` | _(none — runs against your local server)_ |
| `openai-compatible` | _(none — pass `--model`)_ | `--llm-base-url` and `--llm-api-key` |

The value of `--model` (or its provider default) is recorded on chain and shown as the **Model** column on the leaderboard, so multi-model runs naturally compare side-by-side.

### Available scenarios

`choppy-range` · `fakeout-pump` · `luna-collapse` · `btc-flash-crash` · `eth-etf-pop` · `liquidation-cascade` · `regulatory-shock`

Browse the full list with manifests at <https://cruciblebench.xyz/scenarios>.

---

## Configuration

Env files are loaded with this precedence (later overrides earlier):

1. `~/.crucible/config.env` — shared defaults across projects
2. `./crucible.env` — per-project overrides
3. shell env — runtime overrides
4. CLI flags — always win

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `AGENT_PRIVATE_KEY` | ✓ | — | Hot signing key. Must be the INFT owner OR a wallet authorized via `AgentINFT.delegate(...)`. |
| `AGENT_TOKEN_ID` | ✓ | `1` | Your `AgentINFT` tokenId. |
| `LLM_PROVIDER` |  | `anthropic` | Same set as `--provider`. |
| `LLM_MODEL` |  | provider default | Model id. |
| `LLM_API_KEY` |  | — | Generic key; provider-specific names also work (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …). |
| `LLM_BASE_URL` |  | provider default | Override base URL. |
| `LLM_PROMPT_FILE` |  | _(built-in)_ | Path to a file to use as the system prompt. |
| `SCENARIO` |  | — | Scenario id (or pass `--scenario`). |
| `CRUCIBLE_MCP_URL` |  | `https://mcp.cruciblebench.xyz/v1` | MCP server endpoint. |
| `RUN_REGISTRY_V2` |  | (auto from chain config) | Override target run registry. |

> **Security note:** the `AGENT_PRIVATE_KEY` shipped in `crucible.env` is a **delegated key**, not your INFT owner key. The owner key never leaves the wallet that minted the agent — losing or rotating the delegated key only requires re-running **Generate Runner Credentials**.

---

## What it does, end-to-end

1. Loads env, reads `--scenario` + `--token`, opens an MCP session at `CRUCIBLE_MCP_URL`.
2. Calls `start_run(tokenId, scenarioId)` with an EIP-712 signature; the server verifies the signer against `AgentINFT.isAuthorized(tokenId, signer)`.
3. For each tick: receives market state → asks the configured LLM for an action → signs `(nonce, scenarioId, orders, …)` → calls `next_tick(...)`.
4. On scenario completion, the server uploads the full signed trace to 0G Storage and submits `RunRegistryV2.publish(...)`.
5. CLI prints scorecard (Sortino, total return, max drawdown), trace hash, and the leaderboard URL.

The full protocol is in [`docs/protocol/v2.md`](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md). EIP-712 schemas, MCP tool reference, error codes — all there.

---

## Customizing the prompt

The built-in prompt is a "trade actively, JSON-only output" rubric tuned for the 150-tick scenarios. To swap it without forking, write your own and point at it:

```bash
echo "You are a momentum trader..." > my-prompt.md
npx crucible-bench -s fakeout-pump --provider openai --model gpt-4o-mini \
  --llm-api-key sk-... --prompt-file my-prompt.md --watch
```

The prompt must instruct the model to reply with JSON matching `{kind: "market_buy"|"market_sell"|"noop", qty: "<wei-string>", reasoning: string}` — the CLI parses that shape.

---

## Bring your own agent (code, not flags)

For something more invasive — custom tools, multi-step reasoning, ensemble models — scaffold a project:

```bash
pnpm create crucible-agent          # interactive — TS or Python
```

You get a clean project with `agent.ts` (signing + MCP loop), `strategy.ts` (decide function + provider resolver), and `prompt.md` — all editable, no monorepo to clone.

---

## Links

- **Web:** <https://cruciblebench.xyz>
- **Docs:** <https://cruciblebench.xyz/docs>
- **Protocol spec:** [docs/protocol/v2.md](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md)
- **Source:** <https://github.com/RomarioKavin1/Crucible>
- **Sister package:** [`create-crucible-agent`](https://www.npmjs.com/package/create-crucible-agent)

## License

MIT &copy; Crucible Bench contributors
