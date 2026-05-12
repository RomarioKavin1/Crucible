# Crucible — Design Spec

**Status:** Approved (brainstorming phase complete)
**Date:** 2026-05-12
**Target:** 0G APAC Hackathon submission, deadline 2026-05-16 23:59 UTC+8
**Name:** Crucible — a vessel where metals are refined under extreme heat. The metaphor for stress-testing trading agents against historic market crises.

---

## 1. Overview

Crucible is a **verifiable benchmark and improvement tool for OpenClaw trading agents**. A developer who has built an OpenClaw trading agent points Crucible at it, runs it against standardized historical-market scenarios (e.g., the ETH flash crash after Trump's tariff announcement), watches it trade live, and receives an AI-generated coaching report telling them how to improve their agent.

The tool has two surfaces:

- A **local web app** the developer runs on their machine to execute their agent against scenarios and watch the simulation play out live, then read a coaching report.
- A **public leaderboard web app** (deployed) where developers who opt into Compete mode publish their TEE-attested scores and recipe hashes for ranking, comparison, and forking.

The product is positioned simultaneously as a **dev tool** (the dominant use case) and as a **reputation primitive** for the broader 0G ecosystem (Agent IDs accumulate verifiable trading track records that future protocols can read).

### 1.1 Hackathon tracks targeted

- **Track 1 — Agentic Infrastructure & OpenClaw Lab.** Primary. Crucible is OpenClaw-native: it provides standard trading Skills that any OpenClaw agent can adopt, and uses an OpenClaw agent internally as the AI Coach.
- **Track 2 — Agentic Trading Arena (Verifiable Finance).** Primary. Compete mode uses TEE-sealed execution on 0G Compute for verifiable, anti-front-running scoring.
- **Track 5 — Privacy & Sovereign Infrastructure.** Secondary. TEE attestation of agent runs is the trust mechanism for the leaderboard.

### 1.2 Goals

- A developer can install Crucible locally, configure their existing OpenClaw trading agent, and get an objective, multi-scenario performance report within minutes.
- A developer can read a coaching report that tells them concrete, recipe-level changes that would improve their agent's score.
- A developer can opt into Compete mode to publish their agent's score on a public, tamper-resistant leaderboard tied to an Agent ID.
- Any third party can verify that a leaderboard score was achieved on a specific scenario by a specific recipe, without trusting the platform.

### 1.3 Non-goals (v1)

- Live trading on real exchanges — strictly simulation only.
- Equity, FX, or commodity markets — crypto only (BTC, ETH, top alts).
- Multi-agent competitive markets (agents impacting each other's prices) — fixed price tape only.
- Federated or distributed simulation — single-engine, single-machine runs.
- Custom scenario authoring by users — scenarios are platform-curated in v1.
- Real-money rewards or staking — pure benchmark, no token economics in v1.

---

## 2. Architecture

### 2.1 Repository layout

Monorepo with two deployable apps, four shared packages, and a contracts directory:

```
agentarena/
├── apps/
│   ├── web/                  Public leaderboard (Next.js, Vercel)
│   └── local/                Local dev tool (Next.js, runs at localhost)
├── packages/
│   ├── ui-kit/               Shared React components
│   ├── core/                 Shared TS types + Scenario Engine
│   ├── skills/               OpenClaw trading Skill Library
│   └── og-client/            0G Storage/Chain/Compute SDK wrappers
└── contracts/                Solidity contracts for 0G Chain
```

### 2.2 Components

| Component | Owner | Purpose |
|---|---|---|
| **Scenario Engine** | `packages/core` | Deterministic turn-based replay engine. Drives the tick loop, applies slippage, settles fills, builds the agent's view of the world. |
| **Trading Skill Library** | `packages/skills` | OpenClaw Skills exposing a broker API (market data, news, trading, risk, memory). The only network surface the agent has during a run. |
| **Run Recorder** | `packages/core` | Captures one structured record per tick into `trace.jsonl`. Source of truth for replay, scoring, attestation, and Coach input. |
| **AI Coach** | `packages/core` + `og-client` | Post-run analyzer. Itself an OpenClaw agent running on 0G Compute Router. Produces a structured coaching report. |
| **Local Web App** | `apps/local` | Next.js app at `localhost:3000`. Configures runs, executes agents via local backend, streams live, displays Coach report. |
| **Public Web App** | `apps/web` | Next.js app on Vercel. Leaderboard, agent detail, recipe forking, replay viewer (read-only). Reads from 0G Chain + 0G Storage. |
| **Shared UI Kit** | `packages/ui-kit` | `ScenarioReplay` chart, `AgentReasoningStream`, `PnLPanel`, `RecipeDiff`, `CoachingReport` — used by both apps. |
| **0G Client** | `packages/og-client` | Wrappers over 0G Storage SDK (TS), 0G Compute Router, and ethers.js for 0G Chain contracts. |
| **On-chain contracts** | `contracts/` | `ScenarioRegistry`, `AgentRegistry` (ERC-721 Agent ID), `RunRegistry`. |

### 2.3 Tech stack

- **Languages:** TypeScript (apps + packages), Solidity (contracts).
- **Frontend:** Next.js 14 App Router, React, Tailwind, shadcn/ui, TradingView Lightweight Charts.
- **Local backend:** Node service embedded in `apps/local` exposing WebSocket for live run streaming.
- **Smart contracts:** Solidity ^0.8.24, Foundry for tests + deploy.
- **0G stack:** Storage (Log + KV) via TS SDK; Chain via standard ethers.js (EVM-compatible); Compute via Router OpenAI-compatible API; TEE via TeeML for Compete mode.

---

## 3. Simulation Loop

### 3.1 Tick loop

The Scenario Engine drives one iteration per tick. Pseudocode:

```
loop until scenario_end:
    tick = scenario.next_tick()
    market_state.update(tick)
    fills = orderbook.match(pending_orders, tick, slippage_model)
    portfolio.apply(fills)
    snapshot = build_snapshot(tick, market_state, portfolio, news_buffer)
    decision = agent.step(snapshot, timeout=DECISION_TIMEOUT)
    recorder.append(tick, snapshot, decision.trace, portfolio.state)
```

**Determinism guarantees:** Same scenario bundle + same recipe + same RNG seed produces a bit-identical `trace.jsonl`. This property is what makes scores reproducible and what makes TEE attestation meaningful. The engine never reads wall-clock time; the agent sees only `tick.timestamp`.

### 3.2 Per-tick agent budgets

The agent's `step()` call is bounded along three axes:

| Resource | Default cap | Mode | Behavior on exceed |
|---|---|---|---|
| LLM completions | 5 | Both — deterministic | Force-stop, last completion's decision stands |
| Tool calls | 20 | Both — deterministic | Force-stop, partial trace recorded |
| Wall-clock | 30 s | **Practice only** — safety net, non-deterministic | Force-stop, mark tick as `no_decision`, agent's last open orders remain |

**Determinism note:** In Compete mode, the wall-clock cap is disabled. Bounding is purely by LLM/tool-call counts so the same recipe produces the same result regardless of provider latency. Practice mode applies the wall-clock cap as a safety net to prevent runaway local runs.

Caps are declared in `manifest.yaml` per scenario and can be overridden in Practice mode for debugging.

### 3.3 Trading Skill Library

OpenClaw Skills provided in `packages/skills/`. The agent registers these in its OpenClaw config; the implementations are thin IPC wrappers to the Scenario Engine:

| Category | Skills |
|---|---|
| Market data (read-only) | `get_price`, `get_orderbook(depth)`, `get_recent_trades(n)`, `get_volatility(window)` |
| News (read-only) | `get_news_feed(since_ts)` — returns only headlines with `ts ≤ current_tick.ts` |
| Trading | `market_buy(qty)`, `market_sell(qty)`, `limit_order(side, qty, price, ttl)`, `cancel_order(id)` |
| Risk | `set_stop_loss(price)`, `set_take_profit(price)`, `get_position`, `get_balance`, `get_pnl` |
| Memory | `journal_write(key, note)`, `journal_read(key)` |

The OpenClaw gateway is configured for the run to expose **only** these skills — no `fetch`, no web search, no other tools. This is what prevents the agent from looking up the future and what makes a TEE-attested score meaningful.

### 3.4 Slippage model

Fixed price tape (the agent's trades do not move the recorded market). Order types and fill behavior:

**Market orders** — fill immediately at the next tick's `mid` plus modeled slippage:

```
fill_price = mid * (1 + side_sign * slippage_bps/10000)
slippage_bps = base_bps + impact_bps
  base_bps   = 1   (taker-fee approximation)
  impact_bps = 5 * (order_qty / available_top10_depth)
```

**Limit orders** — rest in a local in-engine order book at their stated price. Fill at exactly the limit price (no slippage) if and when the recorded tape trades through it. If the order's TTL expires without a fill, it is cancelled.

**Cancel** — removes a resting limit order. No-op if already filled.

Slippage parameters are declared per-scenario in `manifest.yaml`.

### 3.5 Run Recorder output

One JSON line per tick written to `trace.jsonl`:

```json
{
  "tick": 1247,
  "ts": "2025-04-02T14:32:18Z",
  "market": {"mid": 3421.5, "best_bid": 3421.1, "best_ask": 3421.9, "depth_top10": 128.4},
  "news_seen": [{"ts": "...", "headline": "...", "source": "..."}],
  "agent": {
    "completions": [{"model": "...", "input_tokens": 821, "output_tokens": 142, "content": "..."}],
    "tool_calls": [
      {"name": "get_orderbook", "args": {"depth": 5}, "result": "..."},
      {"name": "market_sell", "args": {"qty": 0.5}, "result": {"order_id": "...", "fill_price": 3416.2}}
    ]
  },
  "portfolio": {"cash": 9821.40, "position": -0.5, "unrealized_pnl": -42.10, "drawdown_pct": -1.7}
}
```

The trace is the canonical input for replay, scoring, the AI Coach, and TEE attestation.

---

## 4. Scenarios

### 4.1 Bundle format

Each scenario is an immutable directory stored on **0G Storage Log layer**:

```
scenarios/<scenario_id>/
├── manifest.yaml          metadata + scoring config
├── ticks.parquet          one row per tick: ts, bid, ask, last, volume
├── orderbook.parquet      L2 snapshots at sampled timestamps
├── news.jsonl             {ts, headline, body, source}
├── starting_state.json    agent's initial cash + position
└── ground_truth.json      held-out; Coach-only, encrypted in Compete mode
```

`manifest.yaml` declares the scoring config, slippage parameters, content hash, and visibility flag. The content hash is registered on-chain via `ScenarioRegistry`.

### 4.2 Data sources (crypto-only for v1)

| Data type | Source | Notes |
|---|---|---|
| Crypto ticks | Binance public REST `/api/v3/aggTrades`, Coinbase Exchange historical | Free, 1 s aggregation |
| L2 orderbook snapshots | Tardis.dev (paid) or Binance depth snapshots | Tardis for v1; reconstruct if no budget |
| Crypto news with timestamps | CryptoPanic API, CoinDesk RSS archives, manual curation | ~10 hand-curated headlines per scenario |
| Macro headlines (tariffs, Fed, etc.) | White House releases, Fed FOMC, X archive via Wayback | Hand-curated for the v1 scenarios |

### 4.3 Scenario library (v1: 10 scenarios)

| # | Scenario | Type | Duration | Tests |
|---|---|---|---|---|
| 1 | ETH — Trump tariff announcement Apr 2025 | News-driven crash | 6 h | News reaction, panic management |
| 2 | BTC — FTX collapse Nov 2022 | Multi-day cascade | 72 h | Long-horizon position management |
| 3 | LUNA — UST depeg May 2022 | Slow-motion contagion | 96 h | Structural break recognition |
| 4 | BTC — COVID March 12, 2020 | Single-day liquidation | 24 h | Survival in extreme volatility |
| 5 | ETH — Merge anticipation Sep 2022 | Anticipation → sell-the-news | 7 d | Thesis vs. event |
| 6 | BTC — Halving Apr 2024 | Slow grind + macro headwinds | 30 d | Patience, low-vol regime |
| 7 | DOGE — Elon tweet pump May 2021 | Social-driven spike | 4 h | Sentiment vs. fundamentals |
| 8 | ETH — Random low-vol weekend (control) | "Nothing happens" | 48 h | Doesn't overtrade on noise |
| 9 | BTC — June 2024 ETF flows pullback | Macro-flow driven | 14 d | Macro context |
| 10 | Held-out: synthetic GBM perturbation of scenario #1 or #4 (selected at publication time) | Anti-overfitting | matches source | Generalization |

Each manifest includes a 2–3 sentence public narrative; `ground_truth.json` is sealed.

### 4.4 Anti-overfitting (Compete mode only)

Four layers, applied only when a user opts into Compete mode and posts to the leaderboard. **Practice mode runs are unaffected** — the developer can replay any scenario freely, see ground truth on demand, and iterate without constraint.

1. **Public + held-out split.** 7 public scenarios, 3 held-out. Held-out manifests are visible; ticks/news/orderbook are streamed only at run time inside the TEE.
2. **Synthetic perturbations.** Each public scenario has 3–5 GBM-perturbed variants sharing the macro narrative but differing in micro detail.
3. **Rotating held-out set.** Every 2 weeks, one held-out scenario rotates public and a new one is added. Scores on the current rotating set get a "Live Alpha" tag.
4. **Recipe attestation.** Every Compete entry hashes its full recipe (model + system prompt + tools + config) to 0G Storage. The Coach flags scenario-specific tuning.

These layers are not bulletproof; layered, they are stricter than existing academic LLM-trading benchmarks (StockBench, Agent Market Arena, AI-Trader).

---

## 5. Practice Mode vs. Compete Mode

| | **Practice mode** (default) | **Compete mode** |
|---|---|---|
| Where it runs | Local machine | TEE on 0G Compute (TeeML) |
| Scenarios available | All public scenarios, freely repeatable | Public + sealed held-out + perturbations |
| Ground truth | Optional toggle in UI | Never visible |
| Recipe attestation | Not required | Required — hash committed on-chain before run |
| Score destination | Local report only | Posted to leaderboard on 0G Chain |
| Cost | User's own model API keys | TEE compute fee in 0G credits |
| Anti-overfitting layers | Not applied | All four applied |

Switching to Compete mode is a deliberate, slightly expensive action in the local UI ("Publish to leaderboard"). This keeps the leaderboard honest by making cheap iteration explicitly opt-out of competition.

---

## 6. AI Coach

### 6.1 Inputs

| Input | Source |
|---|---|
| Agent's full trace | `trace.jsonl` of the just-finished run |
| Scenario manifest + narrative | `manifest.yaml` |
| Ground truth | `ground_truth.json` (sealed; Coach-only) |
| Top-3 performer traces on same scenario | 0G Storage (read public leaderboard entries) |
| Agent's recipe | `recipe.yaml` |
| Top-3 recipes (or aggregate patterns if private) | 0G Storage |
| Failure-mode library | Bundled with Coach (15 named patterns in v1) |

The Coach itself is an OpenClaw agent running on **0G Compute Router** (OpenAI-compatible endpoint). Recursive and on-brand.

### 6.2 Five-pass pipeline

1. **Trade-level critique (mechanical).** For each trade, compute counterfactuals: held-instead-of-sold, sold-instead-of-held, etc. Pure math on the recorded trace.
2. **Decision-point critique (LLM).** Identify 5–10 most consequential decision points (largest PnL deltas, regime shifts, major news). Pull agent reasoning at each, compare to top-performer behavior, write a focused critique per point.
3. **Pattern detection (LLM).** Scan all decisions against failure-mode library (panic seller, FOMO buyer, overtrader, anchoring, news-blind, no-stop, etc.). Output structured detection with confidence + evidence.
4. **Recipe diff (LLM + mechanical).** Compare user's recipe against top-3 leaderboard agents on this scenario: tool set diff (mechanical), system prompt semantic diff (LLM), config delta.
5. **Synthesis (LLM).** Combine passes 1–4 into a ranked list of suggested changes with qualitative impact estimates, specific edit text, and verification steps.

### 6.3 Output

Structured markdown report rendered in the UI:

```
Run #47 — Scenario: ETH-Trump-Tariffs-Apr2025
Score: 0.31 Sortino  |  Drawdown: -18.4%  |  Return: -12.1%
Leaderboard rank (Compete only): #84 / 312

Top-3 issues
  1. Panic seller pattern (high confidence) — concrete fix
  2. Slow news reaction (medium confidence) — concrete fix
  3. Missing tool: get_volatility — concrete fix

Decision-by-decision critique (expandable)
Pattern detection (expandable)
Recipe diff vs. top-3 (expandable)
Suggested new recipe (one-click Copy / Run again)
```

The "Suggested new recipe + one-click rerun" is the loop that makes the product sticky. The local app's `CoachingReport` component renders the suggested recipe as a diff against the current one with two affordances: `Copy` (copies the new YAML to clipboard) and `Run again` (writes the new recipe to a temp file and triggers a new run against the same scenario).

### 6.4 Failure-mode library (v1: 15 patterns)

Hand-written detection rules for: `PANIC_SELLER`, `FOMO_BUYER`, `OVERTRADER`, `ANCHORING`, `NEWS_BLIND`, `NO_STOP_LOSS`, `STOP_TOO_TIGHT`, `OVER_LEVERAGED`, `MEAN_REVERSION_BIAS`, `MOMENTUM_LATECOMER`, `THESIS_DRIFTER`, `NO_POSITION_SIZING`, `TILTED_AFTER_LOSS`, `IGNORES_LIQUIDITY`, `CONFIRMATION_BIAS`. Each pattern declares: detection rule on the trace, evidence-extraction logic, and a remediation template.

### 6.5 Counterfactual phrasing

Counterfactuals are phrased as observations, never as "you should have." Example: *"Holding the 14:32 position to tick 8400 would have realized +$2,140; the agent exited at tick 1247."* Not: *"You should have held."*

---

## 7. On-chain Layer

### 7.1 Contracts (three, deployed on 0G Chain mainnet)

#### 7.1.1 `ScenarioRegistry`

Maps `scenarioId → contentHash` (SHA-256 of the full scenario bundle on 0G Storage). Owner-controlled writes (only platform admin publishes scenarios); public reads.

Functions: `publishScenario(id, contentHash)`, `getScenario(id)`, `listScenarios()`.

#### 7.1.2 `AgentRegistry` (ERC-721 Agent ID)

Each agent is an NFT owned by a wallet. Tracks `agentId → currentRecipeHash` and the full recipe history (event log).

Functions: `mintAgent(metadataURI) → agentId`, `updateRecipe(agentId, recipeHash)`, `getCurrentRecipe(agentId)`, `getRecipeHistory(agentId)`.

#### 7.1.3 `RunRegistry`

Records every Compete-mode run. Append-only.

Storage: `runId → {agentId, scenarioId, recipeHash, traceHash, score, timestamp, teeAttestation}`.

Functions: `recordRun(...attestation)` — verifies TEE signature against a known TEE pubkey set; `getRun(runId)`; `getRunsByAgent(agentId)`; `getRunsByScenario(scenarioId)`.

### 7.2 Compete-mode end-to-end flow

```
1. User clicks "Publish" in local UI
   → recipe uploaded to 0G Storage (KV layer) → recipeHash

2. Local tool calls AgentRegistry.updateRecipe(agentId, recipeHash)
   → on-chain commit locks recipe

3. Local tool calls 0G Compute (TeeML) with (scenarioId, agentId, recipeHash)
   → TEE pulls scenario from 0G Storage, verifies content hash
   → TEE pulls recipe, verifies hash matches on-chain value
   → TEE runs Scenario Engine + agent deterministically
   → TEE writes trace to 0G Storage → traceHash
   → TEE computes score
   → TEE signs attestation hash(agentId || scenarioId || recipeHash || traceHash || score)

4. TEE submits RunRegistry.recordRun(...)
   → contract verifies signature against known TEE pubkey
   → on-chain commit

5. Public web app re-fetches RunRegistry, leaderboard updates within ~30 s
```

### 7.3 Tamper-resistance properties

- Faking a high score requires forging a TEE signature → infeasible.
- Claiming another wallet's recipe blocked by `agentId` ownership via NFT.
- Quiet recipe tuning after a scenario rolls out is detectable via on-chain timestamps; the Coach surfaces suspicious patterns.
- Doctoring a scenario is blocked by `ScenarioRegistry.contentHash` and Log layer immutability.

---

## 8. Public Leaderboard

Surface served by `apps/web` on Vercel. All views are queries over `RunRegistry`.

### 8.1 Ranking views

1. **Overall** — best aggregate Sortino across all 10 scenarios. Headline leaderboard.
2. **Per-scenario** — best agents on each individual scenario. Reveals specialists.
3. **Live Alpha** — scores on the current rotating held-out scenario only. The most honest generalization signal.

### 8.2 Detail pages

- **Agent detail:** Agent ID, owner address, recipe history, all runs across scenarios, aggregate metrics.
- **Replay viewer:** Loads `trace.jsonl` from 0G Storage and renders it via the shared `ScenarioReplay` component. Same playback experience as the local tool but read-only.
- **Recipe diff viewer:** Side-by-side comparison of two recipes (used in agent detail and Coach output).
- **"Fork this recipe":** One-click download of `recipe.yaml` for local modification.

---

## 9. 0G Stack Integration Mapping

| 0G module | Used for |
|---|---|
| **0G Chain** (mainnet) | Three Solidity contracts: `ScenarioRegistry`, `AgentRegistry`, `RunRegistry` |
| **0G Storage — Log layer** | Immutable scenario bundles, immutable run traces |
| **0G Storage — KV layer** | Mutable agent recipes (versioned per agentId) |
| **0G Compute — Router** | AI Coach LLM inference (OpenAI-compatible API) |
| **0G Compute — TeeML** | Compete-mode sealed execution + attestation signing |
| **Agent ID** | Implemented as the `AgentRegistry` ERC-721 NFT — every leaderboard entry attaches to an Agent ID |

---

## 9.1 OpenClaw integration (Track 1 alignment)

OpenClaw is a self-hosted gateway that drives AI coding agents across chat surfaces (Discord, Slack, Telegram, etc.). It exposes a plugin/skill ecosystem and accepts custom OpenAI-compatible model providers via `models.providers.<id>`.

Crucible's relationship to OpenClaw is **interoperable, not coupled**. Three integration paths exist; v1 ships only Path A.

### Path A — `0g-router` as a custom OpenClaw model provider (v1 — docs only)

Crucible's README documents how an OpenClaw user can wire 0G Compute Router into their `~/.openclaw/openclaw.json`:

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
  "agents": {
    "defaults": { "model": { "primary": "0g-router/zai-org/GLM-5-FP8" } }
  }
}
```

Effect: any OpenClaw agent (including the bundled Pi agent) can run inference through 0G Compute. Crucible's AI Coach uses the same Router under the hood. Zero extra build cost.

### Path B — Trading skill bundle on ClawHub (post-v1)

Package Crucible's 12 trading skills (each with a `SKILL.md` + frontmatter) and publish a `crucible-trading-skills` bundle to ClawHub. Any OpenClaw user could `openclaw skills install crucible-trading-skills` and bring trading capabilities to their personal agent (operating against simulated or paper-trading endpoints).

### Path C — Crucible runtime as an OpenClaw plugin (post-v1)

Build an OpenClaw plugin (`openclaw.plugin.json`) that registers Crucible as an agent runtime. `crucible run` would drive an OpenClaw `agent` invocation, gaining session management, multi-channel delivery (chat with your trading agent from Telegram during a backtest), and the standard hook surface (`before_tool_call`, `after_tool_call`, `agent_end`, etc.).

---

## 10. Hackathon Submission Alignment

| Requirement | Fulfilled by |
|---|---|
| Public GitHub repo, substantial commits | The full monorepo |
| 0G mainnet contract address | `RunRegistry` deployment address |
| 0G Explorer link with verifiable activity | Every scenario publication, agent mint, and run record is a transaction |
| Demo video ≤3 min | Records: open local tool → configure agent → run ETH-Trump-tariffs live → watch agent trade → read Coach report → publish to leaderboard → see entry appear publicly |
| README with architecture + 0G modules + deploy steps | Top-level README.md |
| Public X post with hashtags + tags | Promo screenshot + demo clip |
| One-sentence ≤30-word description | Drafted: "Verifiable benchmark and AI coach for OpenClaw trading agents — replay real market scenarios, watch your agent trade live, get TEE-attested scores on a public leaderboard." |

---

## 11. Open Questions

These need answers during implementation but do not block the spec:

- **Agent recipe schema.** Final YAML structure for `recipe.yaml`. Proposal: `model`, `system_prompt`, `tools[]`, `model_config`, `metadata`. Needs validation against OpenClaw's own config format.
- **TEE pubkey distribution.** How does `RunRegistry` know which TEE pubkeys to trust? Proposal for v1: platform admin manually registers attester pubkeys via a setter on the contract. Future: open registration.
- **Scenario authoring tooling.** v1 scenarios are hand-curated by us. The pipeline (data fetch → bundle → publish to Storage → register on Chain) needs a CLI but doesn't ship with v1.
- **Leaderboard re-scoring.** When a scenario rotates from held-out to public, do historical Compete scores stay or get archived? Proposal: stay, with a "Pre-rotation" tag.
- **Local app distribution.** `npx @agentarena/local start` vs. published Docker image vs. standalone binary. v1: npx with Node 22+ requirement.
- **OpenClaw version pinning.** Pin to specific OpenClaw release for reproducibility.

---

## 12. Future Work (post-v1)

Documented to signal scope ambition. Not in v1:

- Equity, FX, commodity scenarios (paid data sources)
- Custom scenario authoring by users
- Multi-agent competitive markets (agents impact each other's prices)
- Real-money rewards / staking on scores
- Federated execution across multiple TEEs for redundancy
- Open TEE attester registration (anyone can run an attester)
- Coach-suggested recipe variants auto-evaluated in batch
- Plugin system for user-contributed failure-mode patterns
- Real-time multi-player arena (live agents trading against each other in shared simulated markets)
- **OpenClaw Path B** — publish Crucible's 12 trading skills as a ClawHub bundle (`crucible-trading-skills`) so any OpenClaw user can install them
- **OpenClaw Path C** — register Crucible as an OpenClaw agent runtime via `openclaw.plugin.json`, enabling chat-from-anywhere monitoring of running benchmarks

---

## 13. Risks

Honest record of risks identified during design:

- **Coach quality is the whole game.** A coach that says "buy low, sell high" is worse than no coach. The Coach's system prompt is itself a research problem; plan for explicit tuning iteration.
- **TEE developer experience on 0G is fresh.** TeeML integration could eat days. Fallback: deterministic local execution with a trusted-attester signing key for v1; migrate to full TEE post-hackathon.
- **OpenClaw + 0G Compute integration scope.** v1 ships only OpenClaw Path A (the `0g-router` provider config doc). Paths B (skill bundle on ClawHub) and C (Crucible-as-OpenClaw-plugin) are deferred — implementing them on the hackathon timeline would compete with the Coach + on-chain layer. The agent in Plan 1 uses the raw Anthropic SDK, which sidesteps OpenClaw runtime as a hard dependency.
- **Scenario data pipeline.** Crypto ticks are easy; historical news with correct timestamps requires manual curation. Budget time explicitly.
- **0G mainnet deployment.** First mainnet deploy has unknown gotchas (RPC, faucet, gas). Test on Galileo first, deploy mainnet with a scripted, reviewed flow.
- **Counterfactual misinterpretation.** Phrasing matters; counterfactuals must be observations, not directives.
- **Timeline.** The submission deadline is 2026-05-16. The design as specified is a 6-week build; compressing it requires explicit cuts which are out of scope for this spec and will be handled in the implementation plan.
