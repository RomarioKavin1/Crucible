# Scenario-Oriented Redesign — Design Spec

**Date**: 2026-05-13
**Status**: Approved (pending user re-review)
**Target**: 0G APAC Hackathon submission, May 16 2026

## 1. Overview

The public web app is currently leaderboard-first. That worked when there was one scenario, but it buries the actual product: the *scenarios*. Crucible Bench is a *catalog* of trading challenges. The leaderboard is one view of any single scenario, not the front door.

This spec reorganizes the site around scenarios, adds a 6-scenario launch catalog (mix of historical replays and synthetic stress tests), introduces a build-time data pipeline for sourcing real market data, and adds a "coming soon" surface for community contributions.

### Goals
- Make the scenario the primary navigable asset.
- Ship a launch catalog with 6 scenarios so the catalog feels populated.
- Give every scenario a self-contained page (description, preview chart, CLI snippet, scoped leaderboard).
- Establish a deterministic, reproducible scenario-bundle pipeline that supports both real and synthetic data.
- Surface the "community scenarios" roadmap without building submission infrastructure yet.

### Non-goals
- Real-time / live-oracle scenarios (deferred).
- Community-authored scenario submission flow (placeholder only).
- Local app (`apps/local`) UI rebuild — keep as-is; the wizard already picks up new scenarios.
- Authentication / accounts on the public site (leaderboard is on-chain, identities are wallet addresses).

---

## 2. Information Architecture

### Top-level routes (`apps/web`)

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing — hero pitch, 3 featured scenario cards, recent runs feed | NEW |
| `/scenarios` | Catalog — all 6 scenarios as chart-as-hero cards with filter chips | NEW |
| `/scenarios/[id]` | Scenario detail with tabs (Overview / Leaderboard / Methodology) | NEW |
| `/leaderboard` | Global leaderboard across all scenarios (the current `/` content, moved) | MOVED |
| `/agents/[id]` | Agent profile | UNCHANGED |
| `/runs/[id]` | Run detail with synchronized player | UNCHANGED |
| `/community` | "Coming soon" placeholder + GitHub Discussions link | NEW |

### Per-scenario page tabs
- **Overview** (default) — narrative description, preview chart with news markers, CLI snippet.
- **Leaderboard** — runs filtered to this scenario, ranked by Sortino.
- **Methodology** — data source, news source, content hash, manifest link.

Tab state lives in the URL as a query param (`?tab=leaderboard`) so tabs are shareable and the browser back button works as expected.

### Header nav
`Scenarios · Leaderboard · Community · GitHub`

---

## 3. Visual Design

Aesthetic continues from the modern-fintech refresh: Inter for body, IBM Plex Mono only for numbers and hashes, dark navy `#0a0e17`, cyan `#22d3ee` / amber `#fbbf24` accents, soft card depth via `.card-elevated`.

### Scenario card (chart-as-hero)

Each card is anchored by the scenario's actual price action — viewers recognize the LUNA collapse silhouette immediately.

```
┌──────────────────────────────────────────┐
│ ╱╲                              ETH-USD  │
│╱  ╲___                                   │
│       ╲___╱╲___                          │  ← preview chart
│                ╲___                       │     (filled area,
│                    ╲___                  │      color-coded)
├──────────────────────────────────────────┤
│ ETH ETF Approval Reaction       Historical│
│ Jan 11 2024 · 240 ticks · 30s/tick       │
│                                           │
│ Best Sortino  Trials  Net move           │
│   +2.14 ▲      12     +12.4%             │
│                                           │
│ ▶ View scenario              [Run locally]│
└──────────────────────────────────────────┘
```

- Hover lifts the card with a subtle shadow and brightens the chart stroke.
- Synthetic scenarios get an amber `Synthetic` badge instead of `Historical`.
- Grid: 3 cols desktop / 2 tablet / 1 mobile.
- Filter chips above the grid: `All · Historical · Synthetic · ETH · BTC · LUNA`.

### Landing page (`/`)

1. **Hero band** (~480px):
   - Kicker (small): "Verifiable benchmarks on 0G"
   - Headline (56px Inter semibold): "Battle-test your OpenClaw agent against real market crises."
   - Subhead: "Replay LUNA's collapse, the BTC flash crash, the ETH ETF reaction. Every run signed and attested on 0G Storage."
   - Primary CTA: `[Browse 6 scenarios →]`
   - Secondary CTA: `[crucible run ↗]` (links to GitHub README)
   - Decorative ribbon of mini-sparklines across the bottom.

2. **Featured scenarios**: 3 cards, hand-picked (likely LUNA + BTC crash + ETH ETF for narrative pull). Subtitle "Live catalog · See all 6 →".

3. **Recent runs feed**: tabular strip of the last 5 attested runs platform-wide (agent #, scenario, Sortino, time-ago). Each row links to `/runs/[id]`.

4. **"How it works" trio** (3 columns): Pick a scenario → Run locally → Publish on-chain.

5. **Footer**: positioning line + GitHub + contract addresses on Galileo.

### Scenario detail page (`/scenarios/[id]`)

Hero block:
- Title + Historical/Synthetic badge + asset chip
- Meta line: `<date> · <duration_ticks> ticks · <tick_interval> per tick`
- Difficulty stars

Below the hero, two-column main area (Overview tab):
- **Left (8 cols)**: preview chart (full-width within column, 360px tall, with news markers) + markdown description + "What this tests" bullet list + CLI snippet with copy button.
- **Right (4 cols)**: "At a glance" stat panel (asset, duration, ticks, starting cash, difficulty, trials, best Sortino) and "On-chain" panel (manifest hash, bundle root, view link).

Below the main: tab strip → Overview ● | Leaderboard | Methodology.

---

## 4. Data Pipeline & Manifest Schema

### Bundle layout (per scenario)

```
scenarios/<id>/
  manifest.yaml    config
  ticks.json       array of Tick (ts, mid, bid, ask, last, volume)
  news.json        array of NewsItem (tick, ts, id, headline, source)
```

### Manifest additions (all optional — existing scenario keeps loading)

```yaml
# Existing fields unchanged ...

kind: historical              # "historical" | "synthetic"
difficulty: 3                 # 1–5, drives the ★★★ display
tags: [news-driven, fade]
description: |                # markdown — Overview tab
  ...
tests: |                      # markdown — "What this tests"
  - Reading bullish news...
data_source:                  # historical only
  provider: binance
  symbol: ETHUSDT
  interval: 1s
  fetched_at: "2026-05-13T12:00:00Z"
news_source: hand-curated
```

### New package: `@crucible/scenario-builder`

Build-time only, not a runtime dependency.

```
packages/scenario-builder/
  src/
    fetch-binance.ts     # REST: GET /api/v3/klines, paginated
    klines-to-ticks.ts   # OHLCV → Tick (mid=(o+c)/2, bid/ask synthesized
                         # via bps spread, last=close, volume=klines.volume)
    synthetic.ts         # programmatic generators (choppy/fakeout/liquidity)
    build-bundle.ts      # writes manifest.yaml + ticks.json + news.json,
                         # computes content_hash = sha256(canonical ticks+news)
    cli.ts               # `crucible-build-scenarios`
  inputs/                # human-edited source files
    eth-etf-approval.yaml
    btc-flash-crash-dec-2024.yaml
    luna-depeg-hour-1.yaml
    choppy-range.yaml
    fakeout-pump.yaml
    liquidity-crisis.yaml
```

### Input recipe (example)

```yaml
id: eth-etf-approval
title: "ETH ETF Approval Reaction"
kind: historical
difficulty: 3
tags: [news-driven, bullish-shock, fade]
description: |
  On January 11, 2024 at 4:00pm ET, the SEC approved 11 spot Bitcoin ETFs.
  ETH spiked 12.4% within 4 hours on the implied read-through, then faded
  4% as traders took profit.
tests: |
  - Reading bullish news and adding risk
  - Holding through the fade vs. taking partial profit at the top
fetch:
  provider: binance
  symbol: ETHUSDT
  interval: 1s
  start: "2024-01-11T20:30:00Z"
  end:   "2024-01-12T00:30:00Z"
news:
  - at: "2024-01-11T20:30:00Z"
    headline: "SEC approves 11 spot Bitcoin ETFs"
    source: WSJ
  - at: "2024-01-11T20:36:00Z"
    headline: "Coinbase confirms ETF custody role"
    source: Coindesk
budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 }
slippage: { base_bps: 1, impact_coeff: 5 }
```

### Build flow

`pnpm run build:scenarios`:
1. Reads each `inputs/*.yaml`.
2. For historical: fetches Binance klines, maps OHLCV to `Tick[]`.
3. For synthetic: runs the named generator with the recipe's parameters.
4. Maps news timestamps to tick indexes by nearest interval boundary.
5. Writes the deterministic `scenarios/<id>/{manifest.yaml, ticks.json, news.json}`.
6. Computes `content_hash` (sha256 over canonical JSON of ticks + news).
7. Output bundles are committed to git — runtime never needs network.

Re-running the build is idempotent given the same Binance archive (historical klines are immutable for past dates).

---

## 5. Scenario Authoring Specs

### Historical

#### ETH ETF Approval Reaction
| Field | Value |
|---|---|
| Asset | ETH-USD (Binance: ETHUSDT) |
| Window | 2024-01-11 20:30 → 2024-01-12 00:30 UTC |
| Tick interval | 30s · 480 ticks |
| Difficulty | ★★★☆☆ |
| Tags | news-driven, bullish-shock, fade |
| Net move | +12.4% peak, +8.5% close |
| Starting | $10K cash, 0 ETH |
| News | t=0 SEC approves 11 spot BTC ETFs (WSJ); t=12 Coinbase confirms ETF custody role (Coindesk); t=180 ETF first-day inflows trail expectations (Bloomberg) |

#### BTC December Flash Crash
| Field | Value |
|---|---|
| Asset | BTC-USD (Binance: BTCUSDT) |
| Window | 2024-12-09 16:00 → 2024-12-09 17:30 UTC |
| Tick interval | 10s · 540 ticks |
| Difficulty | ★★★★☆ |
| Tags | flash-crash, tail-risk, recovery |
| Net move | -8% peak, -2% close |
| Starting | $10K cash, 0.05 BTC |
| News | t=180 Coinbase liquidations spike, BTC down 6% (Bloomberg); t=400 Liquidations clear, market stabilizing (Coindesk) |

#### LUNA Depeg Hour 1
| Field | Value |
|---|---|
| Asset | LUNA-USD (Binance: LUNAUSDT — verify availability) |
| Window | 2022-05-09 16:00 → 2022-05-09 17:00 UTC |
| Tick interval | 10s · 360 ticks |
| Difficulty | ★★★★★ |
| Tags | tail-risk, terminal, depeg |
| Net move | -47% |
| Starting | $10K cash, 100 LUNA |
| News | t=0 UST falls to $0.985, breaks peg (Coindesk); t=90 Anchor outflows accelerate (The Block); t=240 LFG sells BTC reserves (Bloomberg) |

### Synthetic

#### Choppy Range
- ETH-USD synthetic, 1s tick, 200 ticks, difficulty ★★☆☆☆, tags `range-bound, anti-overtrading`.
- Pattern: sine wave + gaussian noise, ±0.3% band around $3,500.
- No news. Tests overtrading discipline (best agent doesn't trade).

#### Fakeout Pump
- ETH-USD synthetic, 1s tick, 150 ticks, difficulty ★★★☆☆, tags `fakeout, FOMO-trap, reversal`.
- Pattern: flat $3,500 t=0–40 → ramp to $3,675 (+5%) t=40–70 → collapse to $3,395 (-3%) t=70–150.
- News (deliberately misleading): t=35 "Whale wallet activated; on-chain analysts flag accumulation" (CryptoQuant). No follow-up news during the dump.
- Tests FOMO resistance.

#### Liquidity Crisis
- ETH-USD synthetic, 1s tick, 200 ticks, difficulty ★★★★☆, tags `microstructure, slippage, depth-shock`.
- Pattern: price drifts -2% over scenario. Orderbook depth shrinks 5x starting at t=80 (`slippage.impact_coeff` ramps from 5 → 25 mid-scenario).
- News: t=80 "Market makers pull bids amid systemic deleveraging fear".
- Tests position sizing under thinning liquidity.

### Aggregate cost model

| Recipe | Calls/tick | Avg ticks/run | Calls/run | Cost/run (Haiku 4.5) |
|---|---|---|---|---|
| haiku-cheap | 2 | 325 | 650 | ~$0.40 |
| baseline-sonnet | 3 | 325 | 975 | ~$4.50 |

---

## 6. Component Reuse & Migration

### Keep as-is

- Run detail page (`/runs/[id]`) — synchronized player works perfectly as the "view a run" target from any leaderboard.
- Agent profile (`/agents/[id]`).
- All contracts. `ScenarioRegistry` already supports new scenario registration by ID + content hash.
- All existing UI components: `TerminalHeader`, `MetricCard`, `Sparkline`, `OnChainProofPanel`, `ScenarioReplay`, `AgentReasoningStream`, `TradesTable`, `EquityCurve`, `PlaybackControls`.

### Reorganized (no rewrites)

- `/` (current leaderboard) → moves to `/leaderboard`. Same component, new path.
- Existing `ScenarioFilterTabs` → repurposed as the filter chips on `/scenarios`.

### New ui-kit components

| Component | Purpose |
|---|---|
| `ScenarioCard` | Chart-as-hero card for landing (3 featured) + catalog (6). |
| `ScenarioHero` | Title + badges + meta + difficulty at top of detail page. |
| `ScenarioPreviewChart` | Non-interactive area chart for cards + detail page header. No markers/tooltip. |
| `Tabs` | Generic tab strip primitive. |
| `CopyableCommand` | Terminal-styled CLI block with Copy button. |
| `DifficultyStars` | ★★★☆☆ display, takes `1–5`. |

### Page-specific (apps/web/components, not ui-kit)

- `LandingHero` — page-specific hero band component.

### New routes / files in apps/web

```
app/
  page.tsx                                       NEW landing
  scenarios/page.tsx                             NEW catalog
  scenarios/[id]/page.tsx                        NEW detail (server)
  scenarios/[id]/ScenarioDetailClient.tsx        NEW (tab switching)
  leaderboard/page.tsx                           MOVED (former /)
  community/page.tsx                             NEW coming-soon
  api/scenarios/route.ts                         NEW
  api/scenarios/[id]/route.ts                    NEW (manifest + downsampled preview)
```

### Local app (`apps/local`)

Out of scope for this redesign. The wizard already lists scenarios from the `scenarios/` directory and will pick up the 5 new ones automatically. Optionally add a "Browse on web" link from the wizard.

### Community placeholder (`/community`)

Single page, no interactivity:
1. Hero: "Community-authored scenarios are coming."
2. What's planned:
   - PR-based contributions: `inputs/<scenario>.yaml` → CI builds bundle → wallet-signed on-chain registration.
   - Curated quality bar.
   - Builders earn attribution on every leaderboard their scenario appears on.
3. "Want to contribute now?" — GitHub Discussions link with a "Propose a scenario" template that maps to the recipe schema.
4. "Get notified" — `mailto:` link initially, no backend.

---

## 7. Implementation Order

1. **Builder package** (`@crucible/scenario-builder` + 6 `inputs/*.yaml` recipes) → all bundles materialized in `scenarios/*`.
2. **API + catalog page** (`/scenarios`) — proves data flow end-to-end.
3. **Scenario detail page** (`/scenarios/[id]`) with Overview tab.
4. **Leaderboard + Methodology tabs** inside scenario detail.
5. **Move existing leaderboard** to `/leaderboard`.
6. **Landing page** (`/`) with hero + featured cards + recent runs.
7. **Community placeholder** (`/community`).
8. **On-chain**: register the 5 new scenarios in `ScenarioRegistry` on Galileo.
9. **Polish + Vercel deploy + DNS** to `cruciblebench.xyz`.

---

## 8. Risks & Open Questions

- **Binance kline coverage for LUNA in May 2022** — verify 1-second granularity is in the public archive. Fallback: 1-minute klines and interpolate; if even 1-min is unavailable, swap to FTX collapse Nov 8 2022 (same narrative energy).
- **News timing precision** — exact intra-minute timestamps for historical headlines are usually unknowable. Pin news to nearest interval boundary; document in Methodology.
- **Scenario card preview data** — `/api/scenarios` returns each scenario's manifest plus a downsampled `~60-point` preview array (precomputed at build time and cached). Keeps cards fast.
- **Tab routing** — query-param-driven (`?tab=leaderboard`) so tabs are shareable and back-button-friendly. The catalog page does not use this pattern; tabs are scenario-detail-only.
- **Existing single scenario migration** — `synthetic-eth-flash-crash` must be updated with the new optional fields (kind=synthetic, difficulty, tags, description, tests) so the UI renders consistently for it.

---

## 9. Out-of-scope (deferred to roadmap)

- Live oracle-fed scenarios.
- Community submission flow (registration, signing, validation).
- Multi-asset scenarios (portfolio across multiple symbols).
- Cost estimator on each scenario card.
- Search across scenarios (filter chips are sufficient at 6 scenarios).
- Authentication / user accounts.
