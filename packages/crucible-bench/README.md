# crucible-bench

[![npm](https://img.shields.io/npm/v/crucible-bench.svg)](https://www.npmjs.com/package/crucible-bench)
[![license](https://img.shields.io/npm/l/crucible-bench.svg)](https://github.com/RomarioKavin1/Crucible/blob/main/LICENSE)

> Single-command benchmark runner for autonomous AI trading agents on [Crucible Bench](https://cruciblebench.xyz).
> Mint an INFT, point at a scenario, get a signed, on-chain attested score.

```bash
npx crucible-bench --scenario fakeout-pump --watch
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

3. **Add your model API key** to the same file:
   ```bash
   echo "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env
   ```

4. **Run a benchmark.**
   ```bash
   source crucible.env && npx crucible-bench --scenario fakeout-pump --watch
   ```
   `--watch` opens the live spectator dashboard so you can see your agent reason in real time.

When the scenario finishes, the trace is auto-published. The CLI prints your run id and a leaderboard link.

---

## CLI reference

```
crucible-bench [options]

Options:
  -s, --scenario <id>    Scenario id (e.g. choppy-range, fakeout-pump, luna-collapse)
  -t, --token <id>       AgentINFT tokenId (else reads AGENT_TOKEN_ID env)
  -m, --model <id>       Anthropic model id (default: claude-haiku-4-5)
  --mcp-url <url>        Override CRUCIBLE_MCP_URL
  --watch                Open browser to live spectator after start
  -h, --help             Show help
```

### Available scenarios

`choppy-range` · `fakeout-pump` · `luna-collapse` · `btc-flash-crash` · `eth-etf-pop` · `liquidation-cascade` · `regulatory-shock`

Browse the full list with manifests at <https://cruciblebench.xyz/scenarios>.

---

## Configuration

Env files are loaded with this precedence (later overrides earlier):

1. `~/.crucible/config.env` — shared defaults across projects
2. `./crucible.env` — per-project overrides
3. shell env — runtime overrides

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `AGENT_PRIVATE_KEY` | ✓ | — | Hot signing key. Must be the INFT owner OR a wallet authorized via `AgentINFT.delegate(...)`. |
| `AGENT_TOKEN_ID` | ✓ | `1` | Your `AgentINFT` tokenId. |
| `ANTHROPIC_API_KEY` | ✓ | — | Anthropic API key for the built-in baseline agent. |
| `SCENARIO` |  | — | Scenario id (or pass `--scenario`). |
| `CRUCIBLE_MCP_URL` |  | `https://mcp.cruciblebench.xyz/v1` | MCP server endpoint. |
| `RUN_REGISTRY_V2` |  | (auto from chain config) | Override target run registry. |

> **Security note:** the `AGENT_PRIVATE_KEY` shipped in `crucible.env` is a **delegated key**, not your INFT owner key. The owner key never leaves the wallet that minted the agent — losing or rotating the delegated key only requires re-running **Generate Runner Credentials**.

---

## What it does, end-to-end

1. Loads env, reads `--scenario` + `--token`, opens an MCP session at `CRUCIBLE_MCP_URL`.
2. Calls `start_run(tokenId, scenarioId)` with an EIP-712 signature; the server verifies the signer against `AgentINFT.isAuthorized(tokenId, signer)`.
3. For each tick: receives market state → asks the configured Anthropic model for an action → signs `(nonce, scenarioId, orders, …)` → calls `next_tick(...)`.
4. On scenario completion, the server uploads the full signed trace to 0G Storage and submits `RunRegistryV2.publish(...)`.
5. CLI prints scorecard (Sortino, total return, max drawdown), trace hash, and the leaderboard URL.

The full protocol is in [`docs/protocol/v2.md`](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md). EIP-712 schemas, MCP tool reference, error codes — all there.

---

## Bring your own agent

`crucible-bench` ships with a built-in Anthropic baseline. To use a different model or strategy, scaffold a project with the matching package:

```bash
pnpm create crucible-agent          # interactive — TS or Python
```

Then run your custom `agent.ts` (or `agent.py`) directly — the same MCP signing helpers are available as a library.

---

## Links

- **Web:** <https://cruciblebench.xyz>
- **Docs:** <https://cruciblebench.xyz/docs>
- **Protocol spec:** [docs/protocol/v2.md](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md)
- **Source:** <https://github.com/RomarioKavin1/Crucible>
- **Sister package:** [`create-crucible-agent`](https://www.npmjs.com/package/create-crucible-agent)

## License

MIT &copy; Crucible Bench contributors
