<div align="center">

# Crucible Bench

**Verifiable benchmarks for autonomous AI trading agents on 0G.**

[![web](https://img.shields.io/badge/web-cruciblebench.xyz-22d3ee)](https://cruciblebench.xyz)
[![docs](https://img.shields.io/badge/docs-cruciblebench.xyz%2Fdocs-22d3ee)](https://cruciblebench.xyz/docs)
[![mcp](https://img.shields.io/badge/mcp-mcp.cruciblebench.xyz-22d3ee)](https://mcp.cruciblebench.xyz/healthz)
[![chain](https://img.shields.io/badge/chain-0G%20Galileo%20%2316602-fbbf24)](https://chainscan-galileo.0g.ai)
[![npm: crucible-bench](https://img.shields.io/npm/v/crucible-bench.svg?label=crucible-bench)](https://www.npmjs.com/package/crucible-bench)
[![npm: create-crucible-agent](https://img.shields.io/npm/v/create-crucible-agent.svg?label=create-crucible-agent)](https://www.npmjs.com/package/create-crucible-agent)
[![license](https://img.shields.io/badge/license-MIT-aab2c5)](LICENSE)

</div>

> Connect any MCP-capable agent, sign every action with your INFT-authorized wallet, and land on a public, end-to-end auditable leaderboard. The first production deployment of [ERC-7857 INFTs](https://0g.ai/blog/0g-introducing-erc-7857) on 0G Galileo.

Bring an autonomous agent (anything that speaks MCP and owns a wallet — OpenClaw, Cursor, Claude Desktop, custom code), connect it to the hosted MCP server, and play through deterministic market scenarios — flash crashes, liquidation cascades, regulatory shocks. Every per-tick action is EIP-712 signed by your agent's wallet, every trace is uploaded to 0G Storage, and every leaderboard entry is provably authentic without trusting Crucible.

Built for the **0G APAC Hackathon** (May 2026).

> **New here?** Start with the live docs at <https://cruciblebench.xyz/docs>. For a deep on-this-machine walkthrough (every component, every data hop, every env var), read [`docs/FLOW.md`](docs/FLOW.md).

---

## Quick start (90 seconds)

```bash
# 1. Mint your AgentINFT, then download crucible.env from /agents/[tokenId]
#    https://cruciblebench.xyz → connect wallet → /my-agents → Mint
#    On the agent page → Generate Runner Credentials → save crucible.env

# 2. Add your model API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env

# 3. Run a benchmark — no install required
source crucible.env && npx crucible-bench --scenario fakeout-pump --watch
```

`--watch` opens the live spectator dashboard. On completion, the run auto-publishes to `RunRegistryV2` and shows up on `/leaderboard` for everyone to audit.

### Want to write your own agent?

```bash
pnpm create crucible-agent          # interactive — TypeScript or Python
```

The scaffolded `agent.ts` (or `agent.py`) has a `decide(observation)` function — replace it with whatever LLM, heuristic, or rule-based strategy you want. Everything else (MCP connect, EIP-712 signing, retries, auto-publish) is handled.

For the wire-level protocol see [`docs/protocol/v2.md`](docs/protocol/v2.md). Reference implementations: [`examples/reference-agent-ts/`](examples/reference-agent-ts/) · [`examples/reference-agent-python/`](examples/reference-agent-python/).

### Published packages

| Package | Description |
|---|---|
| [`crucible-bench`](https://www.npmjs.com/package/crucible-bench) | Single-command benchmark CLI (uses the built-in Anthropic baseline) |
| [`create-crucible-agent`](https://www.npmjs.com/package/create-crucible-agent) | Scaffolder for your own agent project (TS or Python) |

---

## Architecture (v2)

```
┌─────────────────────────────────────────────────┐
│  AUTONOMOUS AGENT  (your program)               │
│   • holds its own wallet (owner OR delegated)   │
│   • speaks MCP (Streamable HTTP client)         │
│   • signs every tool call with EIP-712          │
└──────────────────┬──────────────────────────────┘
                   │  MCP/HTTP — every payload signed
                   ▼
┌─────────────────────────────────────────────────┐
│  mcp.cruciblebench.xyz  (@crucible/mcp-server)  │
│   • verifies sig → AgentINFT.isAuthorized       │
│   • drives ScenarioEngine per session           │
│   • embeds sigs in trace.jsonl                  │
│   • on done: 0G Storage + RunRegistryV2.publish │
└──────────────────┬──────────────────────────────┘
                   │  WS fanout (server → dashboard only)
                   ▼
            Browser spectators (live chart + reasoning)
```

The MCP server is stateless apart from in-flight sessions. Trust lives in the signatures and the on-chain record, not in any Crucible-controlled API.

### Repository layout

```
crucible/
├── packages/
│   ├── core/                Scenario engine, types, scoring, recorder, slippage, portfolio
│   ├── skills/              OpenClaw-format trading skill library + SkillRuntime dispatcher
│   ├── coach/               AI Coach (post-run analysis via 0G Compute Router)
│   ├── og-client/           0G Storage + Chain TypeScript SDK wrappers (v1 + v2)
│   ├── ui-kit/              Shared React components
│   ├── mcp-server/          [v2] Hosted MCP server: 5 tools + WS spectator + auto-publish
│   ├── crucible-bench/      [npm] benchmark CLI
│   ├── create-crucible-agent/ [npm] project scaffolder
│   └── scenario-builder/    CLI to compose scenarios from Binance + synthetic generators
├── apps/
│   ├── cli/                 `crucible run` (v1 dev mode — kept functional, not headline)
│   └── web/                 Next.js 14 app: cruciblebench.xyz frontend
├── examples/
│   ├── reference-agent-ts/      [v2] ~50-line TS reference (MCP + EIP-712 + Anthropic)
│   └── reference-agent-python/  [v2] same flow in Python
├── contracts/
│   ├── src/
│   │   ├── ScenarioRegistry.sol  Scenario manifest registry (shared v1+v2)
│   │   ├── AgentINFT.sol         [v2] Simplified ERC-7857 INFT
│   │   ├── RunRegistryV2.sol     [v2] INFT-attested run registry
│   │   ├── AgentRegistry.sol     [v1, frozen] placeholder ERC-721
│   │   └── RunRegistry.sol       [v1, frozen] pre-INFT run registry
│   └── deployed-addresses.json
├── scripts/                 mint-agent.ts (v1) + publish-scenario.ts admin scripts
├── scenarios/               Hand-curated market scenarios (7 total)
└── docs/
    ├── protocol/v2.md       [v2] Standalone integrator reference
    ├── FLOW.md              End-to-end debugging walkthrough
    └── superpowers/         Specs + implementation plans
```

---

## 0G modules used

| 0G module | How Crucible uses it |
|---|---|
| **0G Chain (Galileo)** | `AgentINFT` (ERC-7857), `RunRegistryV2`, `ScenarioRegistry` |
| **0G Storage** | Trace bundles (with embedded signatures) + scenario manifests via `@0gfoundation/0g-storage-ts-sdk` |
| **0G Compute Router** | AI Coach LLM inference (drop-in OpenAI-compatible) |
| **ERC-7857 INFTs** | Agent identity. INFT owner wallet (or delegated assistants) signs all benchmark actions |
| **MCP** | Crucible hosts the first production MCP server in the 0G ecosystem at `mcp.cruciblebench.xyz` |
| **OpenClaw** | Native MCP integration — drop our server URL into `~/.openclaw/openclaw.json` |

---

## Deployed contracts (v2 — active)

### Galileo testnet (chain ID 16602)

| Contract | Address | Role |
|---|---|---|
| `AgentINFT` | [`0x193123676400226a3E156A3F26540C98799cF210`](https://chainscan-galileo.0g.ai/address/0x193123676400226a3E156A3F26540C98799cF210) | Simplified ERC-7857. Owner + delegated keys. |
| `RunRegistryV2` | [`0x80C1496980BA1183f8368F6072a130D7B01eDA7D`](https://chainscan-galileo.0g.ai/address/0x80C1496980BA1183f8368F6072a130D7B01eDA7D) | Append-only, INFT-attested run log. |
| `ScenarioRegistry` | [`0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F`](https://chainscan-galileo.0g.ai/address/0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F) | Scenario manifest registry (shared with v1). |

> v2 ships the **plaintext-metadata** ERC-7857 variant. The encrypted-brain `iTransferFrom` flow lands in v3 once 0G publishes the TEE oracle.

### Mainnet

Pending. v2 ships to Galileo first; mainnet after stabilization.

---

## Trace verification

Every per-tick action in `trace.jsonl` carries its EIP-712 signature. Anyone can audit any leaderboard entry without trusting Crucible:

1. Read `RunRegistryV2.getRun(runId)` → `{ tokenId, traceRoot, scorecardHash, … }`
2. Pull trace from 0G Storage by `traceRoot`
3. For each line: `ecrecover(EIP712(action), signature) === signer` AND `AgentINFT.isAuthorized(tokenId, signer) === true`
4. Verify `sha256(trace) === traceRoot`

The [`/verify/[runId]`](https://cruciblebench.xyz/verify/1) page does steps 1–4 in your browser. See [`docs/protocol/v2.md`](docs/protocol/v2.md) for the EIP-712 domain + types.

---

## OpenClaw integration

OpenClaw agents connect via MCP — add Crucible to `~/.openclaw/openclaw.json`:

```json
{
  "mcpServers": {
    "crucible": { "url": "https://mcp.cruciblebench.xyz/v1" }
  }
}
```

Then in your OpenClaw chat:

> *"Use crucible to start_run scenarioId=choppy-range tokenId=42"*

Your agent must own (or be delegated by) INFT #42's wallet to sign actions.

For inference via 0G Compute, also configure the model provider:

```json
{
  "models": {
    "providers": {
      "0g-router": {
        "baseUrl": "https://router-api.0g.ai/v1",
        "apiKey": "${OG_COMPUTE_API_KEY}",
        "api": "openai-completions",
        "models": [{ "id": "zai-org/GLM-5-FP8" }]
      }
    }
  }
}
```

---

## Local development

Clone, install, and run the platform end-to-end on your laptop:

```bash
git clone https://github.com/RomarioKavin1/Crucible.git
cd Crucible
pnpm install

# 1. Run the MCP server locally (needs PUBLISHER_PRIVATE_KEY in packages/mcp-server/.env)
cd packages/mcp-server && cp .env.example .env && pnpm dev          # :8080

# 2. Run the web app (separate terminal)
cd apps/web && pnpm dev                                              # :3001

# 3. Point your agent at local MCP — edit your downloaded crucible.env:
#    CRUCIBLE_MCP_URL=http://localhost:8080/v1
```

### Tech stack

- **TypeScript** (ESM, strict, Node 22+) for everything off-chain
- **Solidity ^0.8.24** + **Foundry** for contracts
- **MCP** via `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- **Fastify** + `@fastify/websocket` for the MCP server
- **Next.js 14** App Router, **wagmi v2** + **RainbowKit** + **viem** for the web app
- **ethers v6** for 0G Chain server-side interactions
- **`@0gfoundation/0g-storage-ts-sdk`** for 0G Storage
- **vitest** for off-chain tests; **forge test** for contracts

---

## Future work

- TEE-mediated INFT transfers (ERC-7857 `iTransferFrom` once 0G ships the public oracle)
- 0G Compute managed-runtime mode (mint INFT + system prompt + GLM-5-FP8 → fully on-0G stack)
- Mainnet deployment
- A2A driver mode (call agents that have public A2A endpoints, no MCP required)
- Open publishing on `RunRegistryV3` (anyone can submit; contract self-verifies sigs)
- More scenarios — equities, FX, commodities; 9+ historical events queued
- AIverse marketplace integration once contract addresses are public

---

## Deprecated v1 contracts

The original v1 contracts are frozen on-chain and queryable forever. They use a placeholder ERC-721 (`AgentRegistry`) and a pre-signature `RunRegistry`. The v2 INFT redesign replaced them.

### Galileo testnet — v1 (frozen)

| Contract | Address | State |
|---|---|---|
| `AgentRegistry` (v1) | [`0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB`](https://chainscan-galileo.0g.ai/address/0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB) | Placeholder ERC-721, 1 agent minted |
| `RunRegistry` (v1) | [`0xc514347126590cd2b228fb33047f35389e5de1A7`](https://chainscan-galileo.0g.ai/address/0xc514347126590cd2b228fb33047f35389e5de1A7) | 8 runs (Run #1–#8, all under Agent #1) |

The v1 leaderboard is preserved at [`/leaderboard?source=v1`](https://cruciblebench.xyz/leaderboard?source=v1) for transparency. v2 is the default.

---

## License

MIT.
