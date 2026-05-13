# Crucible UI Redesign — Trading Terminal

**Status:** Approved (brainstorming complete)
**Date:** 2026-05-13
**Scope:** Visual + interaction polish across `apps/web` (public leaderboard) and `apps/local` (lab) and shared `packages/ui-kit`. No new backend functionality except the on-chain proof panel pulls already-existing data into a new component.

---

## Goal

Replace the generic dark-dashboard look with a "trading terminal" identity that:
- Reads as serious finance infrastructure to a hackathon judge
- Foregrounds the **on-chain verifiability** story (the unique value-prop) on the run detail page
- Gives the live run viewer one obvious "wow moment" — watching the agent stream + chart + PnL in real-time

## 1. Design tokens

**Colors:**
| Token | Hex | Use |
|---|---|---|
| `bg.deep` | `#070b14` | Page background |
| `bg.surface` | `#0f1623` | Cards / panels |
| `border.hairline` | `#1f2a3d` | Grids / dividers |
| `text.primary` | `#e5e9f0` | Body text |
| `text.muted` | `#5e6b80` | Labels / metadata |
| `accent.cyan` | `#22d3ee` | Active states, links, positive signals |
| `accent.amber` | `#fbbf24` | News, warnings |
| `chart.up` | `#10b981` | Buys, positive PnL, "▲" |
| `chart.down` | `#ef4444` | Sells, negative PnL, "▼" |

**Typography:**
- Display + numerics: `IBM Plex Mono` (or `JetBrains Mono` fallback) — uppercase, tracked on labels
- Body: `Inter` 14px
- Numerics use `font-variant-numeric: tabular-nums` so columns align
- Scale: 12 (labels) / 14 (body) / 18 (section headers) / 36 (hero metrics)

**Effects:**
- 1px hairline borders, no shadows on base panels
- Active card: subtle cyan radial glow (`shadow: 0 0 60px -20px #22d3ee44`)
- Hover on rows: `border-color → cyan/30`, no background change
- Live status dot: 6px solid cyan with `box-shadow: 0 0 8px #22d3eeaa` + pulse animation

## 2. Header

Both apps share a `<TerminalHeader />` component with:
- Inline SVG monogram (angular "C" in cyan-to-amber gradient)
- Wordmark: `CRUCIBLE` mono uppercase tracked
- Tagline (right of wordmark): `PROVING GROUND` (web) / `LAB` (local)
- Status pill (right side): solid cyan dot + `GALILEO  chain 16602` (web) or `localhost:3002 / GALILEO` (local)
- Nav row: uppercase tracked links with cyan underline on active route

## 3. Leaderboard table

Replace the current `OverallTable` and `PerScenarioTable` with new components that render each row as a **mini agent card with sparkline**:

- Rank: serif numeral, larger, muted
- Agent: NFT diamond glyph + `#ID` (cyan) + truncated owner address
- Trials: count
- Avg Sortino: tabular nums + ▲/▼ + color
- Best: secondary metric
- **Equity curve sparkline**: 60×16px inline SVG generated from the agent's per-run final equity values (or just render a sine-style placeholder if data is sparse)
- Hover: cyan/30 border, no fill change

Per-scenario table keeps similar treatment plus `Return` and `Drawdown` columns and a tappable recipe-hash badge.

## 4. Run detail page (the "wow" page)

Layout zones:

1. **Run header**: back link, `RUN #N` + diamond glyph, two CTAs (`FORK RECIPE`, `COACH THIS RUN`), metadata strip (scenario / agent / attester)
2. **Metric strip**: 4 metric cards (Sortino, Total Return, Max Drawdown, Win Rate). Each with the value, ▲/▼, color, and a thin progress-bar at the bottom showing relative score vs. leaderboard average
3. **Chart panel**: existing `ScenarioReplay` wrapped in a header strip (`ETH-USD  TICK 47/100  ▶`) with playback controls. Bottom-strip overlay: cyan equity curve + drawdown shading
4. **Two-column lower zone**:
   - Left: `AgentReasoningStream` — news ticks get amber left-border + 📰
   - Right: **NEW `OnChainProofPanel` component** — the headline addition

### The OnChainProofPanel

A read-only panel that surfaces the verifiability story for this run:

```
⛓ Run record    runId 0
  tx 0x2b86…26d  ↗

🗄 Trace blob   on 0G Storage
  root 0x6d12…0b3
  storage tx 0xcf83…6a5  ↗

📜 Recipe hash  0x16733d…ad7583
  committed by AgentRegistry.updateRecipe()
```

Each line is a clickable badge linking to:
- chainscan-galileo.0g.ai/tx/<hash> for tx hashes
- chainscan-galileo.0g.ai/address/<contract> for the AgentRegistry link

Data source: already in the `Run` struct returned by `RunRegistry.getRun()` — no new on-chain calls.

### "Coach this run" interaction

Clicking the button:
1. POST `/api/runs/<id>/coach` (NEW route in `apps/web` mirroring the local app's existing one — but the trace must already be downloaded from 0G Storage; the route just calls `runCoach({ entries, scorecard })` against the data the page already has)
2. While running, button shows `COACHING ●` with animated dots
3. On complete, a side-drawer slides in from the right with the `CoachingReport` markdown rendered

For v1 of the polish, if the web-side coach endpoint is too much complexity, fall back to: clicking the button just routes to the local app at `localhost:3002/runs/<id>` (which has the working coach button). Document this as a known limitation.

## 5. Local app live run viewer

Same trading-terminal language, framed as "lab":
- Header tagline: `LAB`
- **Status bar**: tick counter + elapsed wall-clock + pulsing live dot
- **Two-column upper zone**: live tape chart (left, 2/3) + portfolio panel (right, 1/3)
- **Reasoning stream**: newest at top (reverse chronological), current tick gets cyan left-border + pulse animation, news ticks get amber, auto-scroll only when user is at top
- **Bottom action bar** (only when `state === "complete"`): `COACH THIS RUN` (cyan) + `PUBLISH TO LEADERBOARD ↗` (purple) side by side
- **Coach side-drawer**: slides in from the right when Coach button clicked, contains `CoachingReport` component

## 6. Component-level checklist

| Component | Touch |
|---|---|
| `TerminalHeader` | NEW — shared in `@crucible/ui-kit` |
| `MetricCard` | NEW — used in both apps' run detail pages |
| `Sparkline` | NEW — inline SVG, ~30 lines |
| `OnChainProofPanel` | NEW — for the public web run detail page |
| `LeaderboardRow` | NEW — replaces inline table rows in `LeaderboardTable.tsx` |
| `ScenarioReplay` | UPDATE — wrap in chart-header strip with playback controls |
| `AgentReasoningStream` | UPDATE — amber news border, cyan current-tick highlight |
| `PnLPanel` | UPDATE — 4-metric layout, equity bar, larger numerics |
| `CoachingReport` | UNCHANGED — but rendered inside a side-drawer container in apps |
| `apps/web/app/page.tsx` | UPDATE — use new TerminalHeader + LeaderboardRow |
| `apps/web/app/runs/[id]/page.tsx` | UPDATE — new layout zones |
| `apps/local/app/runs/[id]/page.tsx` | UPDATE — new layout zones + side-drawer |

## 7. Out of scope

- Light mode (dark-only)
- Mobile / responsive — desktop only for v1; collapse to single-column at <768px is best-effort
- Animations beyond the pulse and the side-drawer slide (no parallax, no page transitions)
- Custom font self-hosting — use Google Fonts CDN links in the layout
- Replacing TradingView Lightweight Charts — keep them, just restyle the chart container
- A real "playback control" implementation — the `▶` icon in the chart header is decorative for v1 (the chart already shows the recorded data)

## 8. Risks

- **Component count growth**: 4 new shared components + 4 updated. ~3-4 hours of focused implementation.
- **Font loading**: Google Fonts adds 2 network requests. Fallback to system mono if it fails.
- **Sparkline data**: requires deriving equity curves per agent from their runs. For v1, render a simple placeholder pattern if computation is expensive — the ASCII-art mockup quality is "good enough" with a deterministic generated sine.
- **Coach side-drawer in apps/web**: if the web-side coach endpoint isn't trivial to wire (the trace lives on 0G Storage, not local disk), defer with a "view this run in the local lab" link.
