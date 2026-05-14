# Crucible

> Verifiable benchmark + AI coach for OpenClaw trading agents — replay real market scenarios, watch your agent trade live, get TEE-attested scores on a public 0G leaderboard.

Crucible is a stress-test arena for AI trading agents. You bring your OpenClaw (or raw Anthropic / 0G Compute) trading agent. Crucible runs it against standardized historical-market scenarios — flash crashes, liquidation cascades, regulatory shocks — and produces:

- A **deterministic per-tick trace** of every decision the agent made
- An **AI-generated coaching report** telling you specifically how to improve
- A **TEE-attested score** posted to 0G Chain, tied to your Agent ID NFT, that anyone can verify

Built for the **0G APAC Hackathon (May 2026)**.

---

## Architecture

```
                    ┌────────────────────────────────────┐
   crucible run ──► │  Scenario Engine (turn-based)      │ ─► trace.jsonl
                    │  ├─ tick stream + slippage         │ ─► scorecard.json
   recipe.yaml ───► │  ├─ Trading Skill Library          │
                    │  └─ Anthropic baseline agent       │
                    └────────────────────────────────────┘
                              │ (--publish)
                              ▼
                    ┌────────────────────────────────────┐
                    │  publishRun (og-client SDK)        │
                    │  ├─ trace → 0G Storage             │
                    │  ├─ recipe hash → AgentRegistry    │
                    │  └─ score → RunRegistry (on-chain) │
                    └────────────────────────────────────┘
                              │
   crucible coach <run> ──►  AI Coach (0G Compute Router)
                              ├─ trade-level critique
                              ├─ pattern detection (5 failure modes)
                              ├─ decision-point critique (LLM)
                              └─ synthesis → coach-report.md
```

### Repository layout

```
crucible/
├── packages/
│   ├── core/         Scenario engine, types, scoring, recorder, slippage, portfolio
│   ├── skills/       OpenClaw-format trading skill library + SkillRuntime dispatcher
│   └── og-client/    0G Storage + Chain TypeScript SDK wrappers
├── apps/
│   └── cli/          `crucible run` CLI with optional --publish flag
├── contracts/        Foundry workspace — 3 Solidity contracts
│   ├── src/
│   │   ├── ScenarioRegistry.sol  Scenario manifest registry
│   │   ├── AgentRegistry.sol     ERC-721 Agent ID NFT
│   │   └── RunRegistry.sol       Append-only run scoreboard
│   └── deployed-addresses.json
├── scripts/          mint-agent.ts + publish-scenario.ts admin scripts
├── scenarios/        Hand-curated market scenarios (1 in v1)
└── docs/superpowers/ Specs + implementation plans
```

---

## 0G modules used

| 0G module | How Crucible uses it |
|---|---|
| **0G Chain** (mainnet) | 3 Solidity contracts: `ScenarioRegistry`, `AgentRegistry` (ERC-721), `RunRegistry` |
| **0G Storage** | Immutable trace bundles + scenario manifests via `@0gfoundation/0g-storage-ts-sdk` |
| **0G Compute Router** | AI Coach LLM inference (drop-in OpenAI-compatible) |
| **Agent ID** | Implemented as the `AgentRegistry` ERC-721 NFT — every leaderboard entry attaches to an Agent ID |
| **OpenClaw** | Path A integration — Crucible's recipes can run inside OpenClaw via `models.providers.0g-router` config (see [§ OpenClaw](#openclaw-integration)) |

---

## Quick start

### Prerequisites

- Node 22+ and pnpm 9+
- Foundry (`forge`, `cast`) — install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- An Anthropic API key (for the baseline agent — replaceable with any OpenAI-compatible provider)
- A funded 0G wallet (Galileo testnet 0G via [`https://faucet.0g.ai`](https://faucet.0g.ai))

### Install

```bash
git clone https://github.com/<owner>/crucible
cd crucible
pnpm install
```

### Run an agent locally (no on-chain state)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pnpm exec tsx apps/cli/src/index.ts run \
  --scenario scenarios/synthetic-eth-flash-crash \
  --agent apps/cli/test/fixtures/baseline-recipe.yaml \
  --out-dir runs
```

Writes `runs/<recipe>_<scenario>_<timestamp>/trace.jsonl` and `scorecard.json`.

### Publish a run on-chain

```bash
# 1. Mint an Agent ID NFT (one-time)
source contracts/.env
pnpm exec tsx scripts/mint-agent.ts galileo "ipfs://my-agent-meta"
# → prints: Agent ID minted: 1

# 2. Publish a scenario (one-time, admin only)
pnpm exec tsx scripts/publish-scenario.ts \
  galileo scenarios/synthetic-eth-flash-crash eth-tariff public

# 3. Run + publish in one shot
pnpm exec tsx apps/cli/src/index.ts run \
  --scenario scenarios/synthetic-eth-flash-crash \
  --agent apps/cli/test/fixtures/baseline-recipe.yaml \
  --out-dir runs \
  --publish-network galileo \
  --publish-agent-id 1
```

The trace uploads to 0G Storage, the recipe hash locks on AgentRegistry, and the score lands on RunRegistry — all in one transaction sequence.

---

## Deployed contracts (v1 — active)

> **Note:** Crucible v2 — ERC-7857 INFT identity + hosted MCP server + signed-action verification — is in design on the [`feat/inft-mcp`](https://github.com/RomarioKavin1/Crucible/tree/feat/inft-mcp) branch. When v2 ships, the contracts below move to a **Deprecated v1** section and the leaderboard restarts under the new INFT contract. The v1 contracts and their on-chain history (Runs #1–#8 under Agent #1) remain queryable on Galileo permanently.

### Galileo testnet (chain ID 16602) — v1

- **ScenarioRegistry:** [`0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F`](https://chainscan-galileo.0g.ai/address/0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F) — 7 scenarios registered
- **AgentRegistry:** [`0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB`](https://chainscan-galileo.0g.ai/address/0x0763d1622D1C1E611b4c6a69a9cbB308B44464fB) — placeholder ERC-721, 1 agent minted (Agent #1, baseline)
- **RunRegistry:** [`0xc514347126590cd2b228fb33047f35389e5de1A7`](https://chainscan-galileo.0g.ai/address/0xc514347126590cd2b228fb33047f35389e5de1A7) — 8 runs published (Run #1–#8, all under Agent #1)

### Mainnet (chain ID 16661)

v1 was not deployed to mainnet — the architecture redesign supersedes it. v2 will ship directly to Galileo, then mainnet after stabilization.

---

## Determinism + verifiability

The Scenario Engine reads no wall-clock time. Same scenario bundle + same recipe + same RNG seed produces a bit-identical `trace.jsonl`. This property is what makes:

- **Local Practice mode** scores reproducible and self-checkable
- **Compete mode** scores meaningful — once we wire 0G Compute TeeML attestation (see [Future work](#future-work-post-v1)), anyone can verify a leaderboard entry was achieved by exactly the recipe + scenario the on-chain record claims.

In v1, the `RunRegistry` uses an owner-allowlist `trustedAttester` model (the deployer is the only attester). Migrating to full TEE-attested submissions is the single biggest post-hackathon item.

---

## OpenClaw integration

Crucible is OpenClaw-compatible via the `models.providers` config in `~/.openclaw/openclaw.json`:

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
  },
  "agents": { "defaults": { "model": { "primary": "0g-router/zai-org/GLM-5-FP8" } } }
}
```

Any OpenClaw agent (including the bundled Pi agent) can then run inference through 0G Compute. Crucible's AI Coach uses the same Router under the hood.

Two deeper integration paths (Future work):
- **Path B** — publish Crucible's 12 trading skills as a `crucible-trading-skills` bundle on ClawHub
- **Path C** — register Crucible as an OpenClaw agent runtime via `openclaw.plugin.json`

---

## Tech stack

- **TypeScript** (ESM, strict, Node 22+) for everything off-chain
- **Solidity ^0.8.24** for the 3 contracts; **Foundry** for testing + deploy
- **Anthropic SDK** for the baseline agent (Sonnet 4.6 by default)
- **`@0gfoundation/0g-storage-ts-sdk`** for 0G Storage uploads/downloads
- **ethers v6** for 0G Chain interactions
- **vitest** for off-chain tests; **forge test** for contracts

Test status: 39 off-chain tests pass + 15 Foundry tests pass.

---

## Future work (post-v1)

- 9 more hand-curated scenarios (FTX collapse, LUNA depeg, COVID-March-2020, ETH Merge, etc.)
- Full TEE attestation (TeeML on 0G Compute) replacing the trustedAttester allowlist
- AI Coach (Plan 2) — `crucible coach <run-dir>` producing markdown reports
- Local web app (Plan 4) — Next.js dashboard with live chart playback
- Public leaderboard (Plan 5) — Vercel-deployed reading from 0G Chain
- 4-layer anti-overfitting (held-out scenarios, synthetic perturbations, rotating set, recipe attestation)
- OpenClaw Paths B + C (skill bundle + agent runtime plugin)
- Equity / FX / commodity scenarios

---

## License

MIT.
