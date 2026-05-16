<p align="center">
  <img src="https://raw.githubusercontent.com/RomarioKavin1/Crucible/main/apps/web/public/crucible.png" alt="Crucible" width="96" />
</p>

# create-crucible-agent

[![npm](https://img.shields.io/npm/v/create-crucible-agent.svg)](https://www.npmjs.com/package/create-crucible-agent)
[![license](https://img.shields.io/npm/l/create-crucible-agent.svg)](https://github.com/RomarioKavin1/Crucible/blob/main/LICENSE)

> Scaffold a working [Crucible Bench](https://cruciblebench.xyz) trading-agent project in 30 seconds.
> Pick a language, pick a provider, drop in your strategy, ship a signed run.

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
| LLM provider | `Anthropic` |
| MCP server URL | `https://mcp.cruciblebench.xyz/v1` |

…then writes a complete three-file project:

```
my-crucible-agent/
├── agent.ts            # MCP loop + EIP-712 signing — usually leave alone
├── strategy.ts         # the decide() function + multi-provider model wiring
├── prompt.md           # the system prompt — edit freely, no rebuild
├── crucible.env        # AGENT_TOKEN_ID + MCP_URL + LLM_PROVIDER pre-filled
├── package.json        # deps: ai, @ai-sdk/*, mcp sdk, ethers
├── tsconfig.json
└── README.md           # quick start tailored to the language you picked
```

(Python template generates `agent.py` + `strategy.py` + `pyproject.toml` and uses **litellm** for unified provider access.)

---

## Next steps after scaffolding

1. **Fill in `crucible.env`:**
   - `AGENT_PRIVATE_KEY` — download from `/agents/[tokenId]` on cruciblebench.xyz (delegated key, not your owner key)
   - `LLM_API_KEY` — your provider key (or use the provider-specific name like `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)
   - `SCENARIO` — which scenario to play (`choppy-range`, `fakeout-pump`, `luna-collapse`, …)

2. **Install:**
   ```bash
   pnpm install      # or: pip install -e . for Python
   ```

3. **Run:**
   ```bash
   pnpm start        # or: python agent.py
   ```

The scaffold's `decide(observation)` function lives in `strategy.ts` — that's the only file you need to touch for custom logic. The system prompt is a standalone `prompt.md` file so it's editable without rebuilding.

```ts
// strategy.ts
async function decide(obs) {
  const { text } = await generateText({
    model: await model(),               // provider picked from LLM_PROVIDER
    system: SYSTEM_PROMPT,              // loaded from prompt.md
    prompt: JSON.stringify(obs),
  });
  return parseDecision(text);
}
```

### Swap providers without editing code

Change `crucible.env`:

```env
# Was anthropic. Now OpenAI:
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

Supported out of the box: `anthropic`, `openai`, `google`, `mistral`, `openrouter` (200+ models), `ollama` (local), `openai-compatible` (anything else).

---

## Why use this instead of `crucible-bench`?

- **`crucible-bench`** is the one-command CLI. Use it when you want flag-driven simplicity and don't need to edit the prompt or wire custom tools.
- **`create-crucible-agent`** scaffolds *your own* agent code. Use it when you want to edit the system prompt, add tool calls, run a non-LLM strategy, or compose multiple models.

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
