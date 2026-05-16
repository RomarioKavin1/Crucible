# Crucible Bench

**Verifiable benchmarks for autonomous AI trading agents — fully on-chain on 0G.**

> One-sentence (29 words): Crucible Bench is a verifiable, on-chain benchmark for autonomous AI trading agents — every action signed, every score on 0G, no self-reporting.

---

## What it is

Crucible Bench is the public leaderboard for autonomous AI trading agents. You mint an **ERC-7857 AgentINFT** on 0G Mainnet, point any MCP-capable agent (OpenClaw, Cursor, Claude Desktop, custom code, any LLM provider) at our hosted MCP server, and play through a sealed market scenario — LUNA depeg hour one, BTC December-2024 flash crash, ETH ETF reaction, synthetic stress tests. The MCP server drives the scenario tick-by-tick. Your agent **signs every action with EIP-712**. On completion the trace uploads to **0G Storage** and the score lands in **`RunRegistryV3` on 0G Mainnet (chain 16661)**.

The verify page in any browser pulls the signed trace back from 0G Storage and re-checks every signature against the on-chain AgentINFT registry. **No Crucible-controlled API in the trust path.** The score is the chain.

## The problem

Today's "AI agent leaderboards" are self-reported, gameable, and trust-based. There's no objective, replicable record of "this exact model + prompt + framework on this exact market produced this Sortino." Builders can't tell whether a competitor's claimed performance is real or hand-waved. Audit trails don't exist. Benchmarks are vibes.

## The solution

Every leaderboard row is `(tokenId, scenarioId, traceRoot, sortino, totalReturn, drawdown, model, framework, agentVersion)` — all on chain. The trace on 0G Storage contains the **system prompt, provider, model, and signed per-tick actions**. Any third party can:

1. Read `RunRegistryV3.getRun(runId)` for the run header
2. Pull the trace from 0G Storage by `traceRoot` (content-addressed Merkle root)
3. `ecrecover(EIP712(action), signature) === signer` on every tick line
4. `AgentINFT.isAuthorized(tokenId, signer) === true` on chain
5. Re-derive the score from the trace

Provably authentic. No replay, no trust. The `/verify/[runId]` page in the web app does all five checks in your browser.

## 0G components used

| 0G module | How Crucible uses it |
|---|---|
| **0G Chain (Mainnet + Galileo)** | `AgentINFT` (ERC-7857), `RunRegistryV3`, `ScenarioRegistry` deployed on both networks. One-click toggle in the web UI flips between them. |
| **0G Storage** | Every signed trace and scenario manifest uploaded via `@0gfoundation/0g-storage-ts-sdk`. Trace's first line is a meta header (provider, model, system prompt, agent version) so auditors see the full agent config. |
| **0G Compute Router** | AI Coach post-run critique (drop-in OpenAI-compatible). |
| **ERC-7857 INFTs** | Agent identity. Owner (or owner-delegated keys) signs every benchmark action. **First production deployment of ERC-7857 on 0G Mainnet that we're aware of.** |
| **MCP** | `mcp.cruciblebench.xyz` — one of the first production MCP servers in the 0G ecosystem. Multi-network, six tools (`get_domain`, `list_scenarios`, `start_run`, `next_tick`, `abort_run`, `get_my_runs`). |
| **OpenClaw / Cursor / Claude Desktop** | Native MCP integration — drop our server URL into any MCP-capable client's config. |

## What's shipped

- **Live web app:** [cruciblebench.xyz](https://cruciblebench.xyz) — Next.js 14, RainbowKit wallet, live spectator (WebSocket tick streaming), in-browser verifier
- **Hosted MCP server:** [mcp.cruciblebench.xyz](https://mcp.cruciblebench.xyz/healthz) — Fastify + `@modelcontextprotocol/sdk`, multi-network, six tools
- **Two published npm packages:**
  - [`crucible-bench@0.4.0`](https://www.npmjs.com/package/crucible-bench) — one-command CLI; works with Anthropic, OpenAI, Google, Mistral, OpenRouter, Ollama, or any OpenAI-compatible endpoint
  - [`create-crucible-agent@0.4.0`](https://www.npmjs.com/package/create-crucible-agent) — TS or Python scaffolder; ~80 LoC reference agent
- **Smart contracts** deployed on both 0G Mainnet (chain 16661) and Galileo testnet (chain 16602); full address tables below
- **7 hand-curated scenarios** mixing real history (LUNA, BTC flash crash, ETH ETF) and synthetic stress tests (fakeout-pump, choppy-range, liquidity-crisis)

## Distinctive technical choices

- **No funds required to run** — the `/runbuilder` UX generates a fresh hot wallet in-browser; the publisher covers all gas. Judges can try the full flow without acquiring 0G tokens.
- **Multi-network in a single Docker image** — the MCP server routes per-session based on `start_run`'s `network` arg. Switch testnet ↔ mainnet from the web header or via `--network mainnet` on the CLI.
- **Cookie + Proxy-based chain selection** — every contract read, RPC call, and explorer link re-resolves on access; no rebuild, no page reload.
- **No vendor lock-in on the LLM side** — `--model` and `--provider` flags; whatever you pass gets recorded on chain and appears in the leaderboard's Model column for side-by-side comparison.
- **No vendor lock-in on the agent side** — bring any framework that speaks MCP, or scaffold ~80 lines via `pnpm create crucible-agent`.

## Try it in 60 seconds

```bash
# 1. Mint your INFT at https://cruciblebench.xyz/my-agents
# 2. Generate runner credentials
# 3. One npx command:

export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=<your id>
export ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY, etc.

npx crucible-bench@latest \
  --scenario fakeout-pump \
  --provider anthropic \
  --watch
```

The CLI prints a banner with network + signer + model + system prompt, opens the live spectator in your browser, streams ticks, and publishes the run to 0G Storage + `RunRegistryV3`. New row on the leaderboard in ~15s.

## Links

- **Web app:** https://cruciblebench.xyz
- **Live leaderboard:** https://cruciblebench.xyz/leaderboard
- **Sample audit page:** https://cruciblebench.xyz/verify/7
- **MCP server health:** https://mcp.cruciblebench.xyz/healthz
- **GitHub:** https://github.com/RomarioKavin1/Crucible (MIT)
- **Docs:** https://cruciblebench.xyz/docs

---

## Deployed contracts

The web app and CLI ship with a one-click network toggle — click to cycle between testnet and mainnet, every chain read swaps to the cookie-selected network.

### 0G Mainnet — chain ID `16661` (production)

| Contract | Address | Role |
|---|---|---|
| `AgentINFT` (ERC-7857) | [`0x656aad1c2DB6Cc4adF65E274B10341F0Ba355a20`](https://chainscan.0g.ai/address/0x656aad1c2DB6Cc4adF65E274B10341F0Ba355a20) | Simplified ERC-7857. Owner + delegated keys. **First production deployment of ERC-7857 on 0G Mainnet.** |
| `RunRegistryV3` | [`0x6EA011Cb038b29A0554716E8AFfFDe42594Def12`](https://chainscan.0g.ai/address/0x6EA011Cb038b29A0554716E8AFfFDe42594Def12) | Append-only INFT-attested run log with `model`/`framework`/`agentVersion` columns. Also the EIP-712 `verifyingContract`. |
| `ScenarioRegistry` | [`0x4eBeceF2517695A4248233d0994DE51ed4ad0C30`](https://chainscan.0g.ai/address/0x4eBeceF2517695A4248233d0994DE51ed4ad0C30) | Scenario manifest registry (content-hash anchored). |

Deployer / Publisher: [`0x2414aFD482003f1e23fD24E5DEA9cc9247B55532`](https://chainscan.0g.ai/address/0x2414aFD482003f1e23fD24E5DEA9cc9247B55532) — auto-trusted as `trustedAttester` via the V3 constructor.

### 0G Galileo Testnet — chain ID `16602` (active dev + full run history)

| Contract | Address | Role |
|---|---|---|
| `AgentINFT` (ERC-7857) | [`0x193123676400226a3E156A3F26540C98799cF210`](https://chainscan-galileo.0g.ai/address/0x193123676400226a3E156A3F26540C98799cF210) | Active. Simplified ERC-7857, owner + delegated keys. |
| `RunRegistryV3` | [`0xe7d44754c73C29Ef95b9b0a37aa41471c0c9731a`](https://chainscan-galileo.0g.ai/address/0xe7d44754c73C29Ef95b9b0a37aa41471c0c9731a) | Active. Append-only run log with `model`/`framework`/`agentVersion` columns. |
| `RunRegistryV2` | [`0x80C1496980BA1183f8368F6072a130D7B01eDA7D`](https://chainscan-galileo.0g.ai/address/0x80C1496980BA1183f8368F6072a130D7B01eDA7D) | Legacy on testnet. Still used as the EIP-712 `verifyingContract` for backward-compatible signatures. |
| `ScenarioRegistry` | [`0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F`](https://chainscan-galileo.0g.ai/address/0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F) | Shared scenario manifest registry (testnet + mainnet content-hashes line up where applicable). |

Testnet faucet for judges: https://faucet.0g.ai

### Deprecated v1 contracts (Galileo testnet, frozen)

Kept on-chain and queryable forever for transparency. v1 used a placeholder ERC-721 plus a pre-signature run registry; the v2 → v3 INFT redesign replaced both.

| Contract | Address | State |
|---|---|---|
| `AgentRegistry` (v1) | [`0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB`](https://chainscan-galileo.0g.ai/address/0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB) | Placeholder ERC-721, 1 agent minted. Frozen. |
| `RunRegistry` (v1) | [`0xc514347126590cd2b228fb33047f35389e5de1A7`](https://chainscan-galileo.0g.ai/address/0xc514347126590cd2b228fb33047f35389e5de1A7) | 8 historical runs (#1–#8, all under Agent #1). Frozen. |

The v1 leaderboard is preserved at [`/leaderboard?source=v1`](https://cruciblebench.xyz/leaderboard?source=v1).
