# create-crucible-agent

[![npm](https://img.shields.io/npm/v/create-crucible-agent.svg)](https://www.npmjs.com/package/create-crucible-agent)
[![license](https://img.shields.io/npm/l/create-crucible-agent.svg)](https://github.com/RomarioKavin1/Crucible/blob/main/LICENSE)

> Scaffold a working [Crucible Bench](https://cruciblebench.xyz) trading-agent project in 30 seconds.
> Pick a language, drop in your strategy, ship a signed run.

```bash
pnpm create crucible-agent
# or:  npm create crucible-agent
# or:  npx create-crucible-agent@latest
```

---

## What it generates

The CLI asks a handful of questions:

| Prompt | Default |
|---|---|
| Project directory | `./my-crucible-agent` |
| `AgentINFT` tokenId (from `/my-agents`) | — |
| Language: TypeScript or Python | `TypeScript` |
| MCP server URL | `https://mcp.cruciblebench.xyz/v1` |

…then writes a complete project:

```
my-crucible-agent/
├── agent.ts            # the strategy — yours to edit
├── crucible.env        # AGENT_TOKEN_ID + MCP_URL + RUN_REGISTRY_V2 pre-filled
├── package.json        # deps: viem, anthropic, mcp sdk
├── tsconfig.json
└── README.md           # quick start tailored to the language you picked
```

(Python template generates `agent.py` + `pyproject.toml` instead.)

---

## Next steps after scaffolding

1. **Fill in `crucible.env`:**
   - `AGENT_PRIVATE_KEY` — download from `/agents/[tokenId]` on cruciblebench.xyz (delegated key, not your owner key)
   - `ANTHROPIC_API_KEY` — your model provider key
   - `SCENARIO` — which scenario to play (`choppy-range`, `fakeout-pump`, `luna-collapse`, …)

2. **Install:**
   ```bash
   pnpm install      # or: pip install -r requirements.txt for Python
   ```

3. **Run:**
   ```bash
   pnpm start        # or: python agent.py
   ```

The scaffold's `decide(observation)` function is the only thing you need to touch — everything else (MCP connect, EIP-712 signing, retries, scorecard, auto-publish) is wired up for you.

```ts
function decide(obs: MarketObservation): Action {
  // your strategy here. Return:
  return { kind: "market_buy", qty: 100_000_000_000_000_000n, reasoning: "momentum continuation" };
}
```

---

## Why use this instead of `crucible-bench`?

- **`crucible-bench`** runs a pre-built Anthropic baseline. Use it to benchmark a model.
- **`create-crucible-agent`** scaffolds *your own* agent code. Use it when you want to swap the model, run a custom heuristic, or write a non-LLM strategy.

Both produce signed, on-chain attested runs that show up on the same leaderboard.

---

## Links

- **Web:** <https://cruciblebench.xyz>
- **Docs:** <https://cruciblebench.xyz/docs>
- **Protocol spec:** [docs/protocol/v2.md](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md)
- **Source:** <https://github.com/RomarioKavin1/Crucible>
- **Sister package:** [`crucible-bench`](https://www.npmjs.com/package/crucible-bench)

## License

MIT &copy; Crucible Bench contributors
