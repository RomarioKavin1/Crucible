# Crucible AI Coach Implementation Plan (Plan 2 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Ship a `crucible coach <run-dir>` CLI command that reads a `trace.jsonl` + `scorecard.json` from a prior run and produces a structured `coach-report.md` with actionable improvement suggestions, powered by 0G Compute Router (OpenAI-compatible API).

**Architecture:** New package `@crucible/coach` depending on `@crucible/core`. Implements a 5-pass pipeline: mechanical trade critique → LLM decision critique → mechanical pattern detection → LLM recipe synthesis. Coach is itself an LLM-powered analyzer; it uses 0G Compute Router via the standard `openai` SDK with `baseURL` swapped.

**Tech Stack:** TypeScript ESM, `openai` SDK ^4.x (works with any OpenAI-compatible endpoint), zod for LLM-output validation, existing `@crucible/core` types.

**Out of scope (later):** Top-performer recipe diffs (no leaderboard yet — added in Plan 5), failure-mode library beyond the v1 5 patterns, suggested-recipe one-click rerun (UI work — Plan 4).

---

## File Structure

```
packages/coach/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── types.ts            CoachReport, Decision, Pattern, Suggestion types
│   ├── trace-reader.ts     Load trace.jsonl + scorecard.json
│   ├── trade-critique.ts   Pass 1 (mechanical)
│   ├── pattern-library.ts  5 hand-written failure-mode patterns
│   ├── pattern-detect.ts   Pass 3 (mechanical detection)
│   ├── og-llm-client.ts    0G Compute Router OpenAI-compatible wrapper
│   ├── decision-critique.ts  Pass 2 (LLM)
│   ├── synthesis.ts        Pass 5 (LLM)
│   ├── render.ts           Markdown renderer
│   ├── coach.ts            Top-level orchestrator
│   └── index.ts
└── test/
    ├── trace-reader.test.ts
    ├── trade-critique.test.ts
    ├── pattern-detect.test.ts
    ├── render.test.ts
    └── fixtures/
        └── sample-run/
            ├── trace.jsonl
            └── scorecard.json

apps/cli/src/
├── coach.ts          New `crucible coach <run-dir>` command
└── index.ts          Add the coach subcommand
```

---

## Task 1: Bootstrap @crucible/coach package

**Files:**
- Create: `packages/coach/package.json`
- Create: `packages/coach/tsconfig.json`
- Create: `packages/coach/vitest.config.ts`
- Create: `packages/coach/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@crucible/coach",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crucible/core": "workspace:*",
    "openai": "^4.60.0",
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../core" }]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Create empty index**

`packages/coach/src/index.ts`: `export {};`

- [ ] **Step 5: Install + typecheck**

```bash
pnpm install
pnpm --filter @crucible/coach typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/coach
git commit -m "feat(coach): bootstrap @crucible/coach package"
```

---

## Task 2: Define coach types

**Files:**
- Create: `packages/coach/src/types.ts`
- Modify: `packages/coach/src/index.ts`

- [ ] **Step 1: Implement types.ts**

```typescript
import type { TraceEntry } from "@crucible/core";

/** A single trade-level critique entry */
export interface TradeCritique {
  tick: number;
  ts: string;
  side: "buy" | "sell";
  qty: number;
  fillPrice: number;
  counterfactualHold: {
    untilTick: number;
    untilPrice: number;
    pnlIfHeld: number;
  };
  observation: string;
}

/** A consequential decision point flagged for LLM critique */
export interface DecisionPoint {
  tick: number;
  ts: string;
  reason: "largest_pnl_delta" | "regime_shift" | "news_arrival";
  pnlDelta: number;
  agentReasoning: string;
  marketContext: string;
}

/** A decision-point critique from the LLM */
export interface DecisionCritique {
  tick: number;
  critique: string;
  recommendation: string;
}

/** A detected behavioral pattern from the failure-mode library */
export interface PatternDetection {
  patternId: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  remediation: string;
}

/** The final synthesized recommendation */
export interface CoachSuggestion {
  rank: number;
  title: string;
  impact: "high" | "medium" | "low";
  rationale: string;
  promptEditSuggestion?: string;
  verificationStep: string;
}

/** Full coach report */
export interface CoachReport {
  runId: string;
  scenarioId: string;
  recipeName: string;
  scorecard: {
    sortino: number;
    maxDrawdownPct: number;
    totalReturnPct: number;
    winRate: number;
  };
  tradeCritiques: TradeCritique[];
  decisionCritiques: DecisionCritique[];
  patternsDetected: PatternDetection[];
  topSuggestions: CoachSuggestion[];
  rawTrace: TraceEntry[];
}
```

- [ ] **Step 2: Re-export**

Append to `packages/coach/src/index.ts`:
```typescript
export * from "./types.js";
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @crucible/coach typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/coach/src
git commit -m "feat(coach): types for trade critiques, patterns, suggestions"
```

---

## Task 3: Trace reader

**Files:**
- Create: `packages/coach/src/trace-reader.ts`
- Create: `packages/coach/test/trace-reader.test.ts`
- Create: `packages/coach/test/fixtures/sample-run/trace.jsonl`
- Create: `packages/coach/test/fixtures/sample-run/scorecard.json`

- [ ] **Step 1: Create sample-run fixture**

`packages/coach/test/fixtures/sample-run/scorecard.json`:
```json
{
  "scenario": "synthetic-eth-flash-crash",
  "recipe": "baseline-claude",
  "scorecard": { "sortino": 0.31, "maxDrawdownPct": -0.184, "totalReturnPct": -0.121, "winRate": 0.4 },
  "ticksProcessed": 5
}
```

`packages/coach/test/fixtures/sample-run/trace.jsonl` — 5 minimal lines representing a buy then sell:
```jsonl
{"tick":0,"ts":"2025-04-02T13:00:00Z","market":{"ts":"2025-04-02T13:00:00Z","mid":3500,"bid":3499.5,"ask":3500.5,"last":3500,"volume":1},"newsSeen":[],"agent":{"completions":[{"model":"claude-sonnet-4-6","inputTokens":500,"outputTokens":100,"content":"I will buy 1 ETH to test the strategy."}],"toolCalls":[{"name":"market_buy","args":{"qty":1},"result":{"id":"m-1","fillPrice":3500.35}}]},"fills":[{"orderId":"m-1","side":"buy","qty":1,"price":3500.35,"feeBps":0,"ts":"2025-04-02T13:00:00Z","tick":0}],"portfolio":{"cash":6499.65,"position":1,"realizedPnl":0,"unrealizedPnl":-0.35,"highWaterEquity":10000,"drawdownPct":-0.000035}}
{"tick":1,"ts":"2025-04-02T13:00:01Z","market":{"ts":"2025-04-02T13:00:01Z","mid":3502,"bid":3501.5,"ask":3502.5,"last":3502,"volume":1},"newsSeen":[],"agent":{"completions":[{"model":"claude-sonnet-4-6","inputTokens":520,"outputTokens":80,"content":"Position holding. Wait."}],"toolCalls":[]},"fills":[],"portfolio":{"cash":6499.65,"position":1,"realizedPnl":0,"unrealizedPnl":1.65,"highWaterEquity":10001.65,"drawdownPct":0}}
{"tick":2,"ts":"2025-04-02T13:00:02Z","market":{"ts":"2025-04-02T13:00:02Z","mid":3450,"bid":3449.5,"ask":3450.5,"last":3450,"volume":3},"newsSeen":[{"ts":"2025-04-02T13:00:01Z","headline":"Trump tariff news","body":"...","source":"test"}],"agent":{"completions":[{"model":"claude-sonnet-4-6","inputTokens":580,"outputTokens":120,"content":"Sharp drop and news. Panic sell."}],"toolCalls":[{"name":"market_sell","args":{"qty":1},"result":{"id":"m-2","fillPrice":3449.66}}]},"fills":[{"orderId":"m-2","side":"sell","qty":1,"price":3449.66,"feeBps":0,"ts":"2025-04-02T13:00:02Z","tick":2}],"portfolio":{"cash":9949.31,"position":0,"realizedPnl":-50.69,"unrealizedPnl":0,"highWaterEquity":10001.65,"drawdownPct":-0.005232}}
{"tick":3,"ts":"2025-04-02T13:00:03Z","market":{"ts":"2025-04-02T13:00:03Z","mid":3480,"bid":3479.5,"ask":3480.5,"last":3480,"volume":1},"newsSeen":[],"agent":{"completions":[{"model":"claude-sonnet-4-6","inputTokens":540,"outputTokens":50,"content":"No action."}],"toolCalls":[]},"fills":[],"portfolio":{"cash":9949.31,"position":0,"realizedPnl":-50.69,"unrealizedPnl":0,"highWaterEquity":10001.65,"drawdownPct":-0.005232}}
{"tick":4,"ts":"2025-04-02T13:00:04Z","market":{"ts":"2025-04-02T13:00:04Z","mid":3520,"bid":3519.5,"ask":3520.5,"last":3520,"volume":1},"newsSeen":[],"agent":{"completions":[{"model":"claude-sonnet-4-6","inputTokens":540,"outputTokens":60,"content":"Market recovered. No re-entry."}],"toolCalls":[]},"fills":[],"portfolio":{"cash":9949.31,"position":0,"realizedPnl":-50.69,"unrealizedPnl":0,"highWaterEquity":10001.65,"drawdownPct":-0.005232}}
```

- [ ] **Step 2: Write the failing test**

`packages/coach/test/trace-reader.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures/sample-run");

describe("loadRun", () => {
  it("loads trace.jsonl and scorecard.json from a run directory", async () => {
    const run = await loadRun(FIXTURE);
    expect(run.entries).toHaveLength(5);
    expect(run.entries[0]?.tick).toBe(0);
    expect(run.scorecard.scorecard.sortino).toBeCloseTo(0.31);
    expect(run.scenarioId).toBe("synthetic-eth-flash-crash");
    expect(run.recipeName).toBe("baseline-claude");
  });
});
```

- [ ] **Step 3: Run test, expect fail**

```bash
pnpm --filter @crucible/coach test trace-reader
```

- [ ] **Step 4: Implement trace-reader.ts**

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TraceEntry } from "@crucible/core";

export interface ScorecardFile {
  scenario: string;
  recipe: string;
  scorecard: {
    sortino: number;
    maxDrawdownPct: number;
    totalReturnPct: number;
    winRate: number;
  };
  ticksProcessed: number;
}

export interface LoadedRun {
  runDir: string;
  scenarioId: string;
  recipeName: string;
  entries: TraceEntry[];
  scorecard: ScorecardFile;
}

export async function loadRun(runDir: string): Promise<LoadedRun> {
  const traceRaw = await readFile(path.join(runDir, "trace.jsonl"), "utf8");
  const entries: TraceEntry[] = traceRaw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as TraceEntry);
  const scorecardRaw = await readFile(path.join(runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw) as ScorecardFile;
  return {
    runDir,
    scenarioId: scorecard.scenario,
    recipeName: scorecard.recipe,
    entries,
    scorecard,
  };
}
```

- [ ] **Step 5: Re-export**

Append to `packages/coach/src/index.ts`:
```typescript
export * from "./trace-reader.js";
```

- [ ] **Step 6: Verify + commit**

```bash
pnpm --filter @crucible/coach test trace-reader
git add packages/coach/src/trace-reader.ts packages/coach/src/index.ts packages/coach/test
git commit -m "feat(coach): trace + scorecard reader"
```

---

## Task 4: Trade-level critique (mechanical Pass 1)

**Files:**
- Create: `packages/coach/src/trade-critique.ts`
- Create: `packages/coach/test/trade-critique.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/coach/test/trade-critique.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeTradeCritiques } from "../src/trade-critique.js";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("computeTradeCritiques", () => {
  it("produces counterfactual hold analysis for the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    const critiques = computeTradeCritiques(run.entries);
    expect(critiques).toHaveLength(2);

    const buyCritique = critiques[0]!;
    expect(buyCritique.side).toBe("buy");
    expect(buyCritique.tick).toBe(0);

    const sellCritique = critiques[1]!;
    expect(sellCritique.side).toBe("sell");
    expect(sellCritique.tick).toBe(2);
    // Hold-from-sell-tick to end: would have been at price 3520 vs sell at 3449.66
    // pnlIfHeld for a sold long: opportunity cost = (endPrice - sellPrice) * qty
    expect(sellCritique.counterfactualHold.pnlIfHeld).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Verify fail, then implement**

```typescript
// packages/coach/src/trade-critique.ts
import type { TraceEntry, Fill } from "@crucible/core";
import type { TradeCritique } from "./types.js";

export function computeTradeCritiques(entries: TraceEntry[]): TradeCritique[] {
  const critiques: TradeCritique[] = [];
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry) return critiques;

  for (const entry of entries) {
    for (const fill of entry.fills) {
      const cf = computeCounterfactual(entries, fill);
      critiques.push({
        tick: fill.tick,
        ts: fill.ts,
        side: fill.side,
        qty: fill.qty,
        fillPrice: fill.price,
        counterfactualHold: cf,
        observation: phraseObservation(fill, cf),
      });
    }
  }
  return critiques;
}

function computeCounterfactual(
  entries: TraceEntry[],
  fill: Fill
): TradeCritique["counterfactualHold"] {
  const last = entries[entries.length - 1]!;
  const untilTick = last.tick;
  const untilPrice = last.market.last;
  let pnlIfHeld: number;
  if (fill.side === "buy") {
    pnlIfHeld = fill.qty * (untilPrice - fill.price);
  } else {
    pnlIfHeld = fill.qty * (untilPrice - fill.price);
  }
  return { untilTick, untilPrice, pnlIfHeld };
}

function phraseObservation(fill: Fill, cf: TradeCritique["counterfactualHold"]): string {
  const direction = fill.side === "buy" ? "bought" : "sold";
  const pos = cf.pnlIfHeld >= 0 ? "+" : "";
  return `${direction} ${fill.qty} @ ${fill.price.toFixed(2)}. By tick ${cf.untilTick} price was ${cf.untilPrice.toFixed(2)} (${pos}${cf.pnlIfHeld.toFixed(2)} if held).`;
}
```

- [ ] **Step 3: Re-export, verify, commit**

```bash
# Append to index.ts: export * from "./trade-critique.js";
pnpm --filter @crucible/coach test trade-critique
git add packages/coach
git commit -m "feat(coach): trade-level counterfactual critique (Pass 1)"
```

---

## Task 5: Failure-mode pattern library

**Files:**
- Create: `packages/coach/src/pattern-library.ts`

- [ ] **Step 1: Implement pattern-library.ts**

```typescript
import type { TraceEntry, Fill } from "@crucible/core";

export interface PatternRule {
  id: string;
  title: string;
  detect: (entries: TraceEntry[]) => { confidence: "low" | "medium" | "high"; evidence: string[] } | null;
  remediation: string;
}

/** Sells within 5 ticks of a -3% drawdown. */
const PANIC_SELLER: PatternRule = {
  id: "PANIC_SELLER",
  title: "Panic seller — exits positions on sharp drawdowns instead of reassessing",
  detect: (entries) => {
    const evidence: string[] = [];
    let panicSells = 0;
    let totalSells = 0;
    for (const e of entries) {
      for (const f of e.fills) {
        if (f.side !== "sell") continue;
        totalSells++;
        if (e.portfolio.drawdownPct <= -0.03) {
          panicSells++;
          evidence.push(`tick ${e.tick}: sell ${f.qty} @ ${f.price.toFixed(2)} during ${(e.portfolio.drawdownPct * 100).toFixed(2)}% drawdown`);
        }
      }
    }
    if (totalSells === 0 || panicSells / totalSells < 0.4) return null;
    const ratio = panicSells / totalSells;
    return {
      confidence: ratio > 0.7 ? "high" : "medium",
      evidence: evidence.slice(0, 5),
    };
  },
  remediation: "Add to system prompt: 'Do not sell purely in response to drawdowns. First reassess thesis using news and price action.'",
};

/** Places orders in >70% of ticks (overtrading) */
const OVERTRADER: PatternRule = {
  id: "OVERTRADER",
  title: "Overtrader — places orders on too many ticks, burning slippage",
  detect: (entries) => {
    if (entries.length === 0) return null;
    const ticksWithFills = entries.filter((e) => e.fills.length > 0).length;
    const ratio = ticksWithFills / entries.length;
    if (ratio < 0.5) return null;
    return {
      confidence: ratio > 0.8 ? "high" : "medium",
      evidence: [`${ticksWithFills}/${entries.length} ticks had at least one fill (${(ratio * 100).toFixed(0)}%)`],
    };
  },
  remediation: "Add to system prompt: 'Only trade when you have a clear edge. Hold positions when no new information arrives.'",
};

/** Never reads news_feed despite news arriving */
const NEWS_BLIND: PatternRule = {
  id: "NEWS_BLIND",
  title: "News-blind — never queries news despite headlines arriving",
  detect: (entries) => {
    const ticksWithNews = entries.filter((e) => e.newsSeen.length > 0).length;
    const ticksWithNewsCall = entries.filter((e) =>
      e.agent.toolCalls.some((tc) => tc.name === "get_news_feed")
    ).length;
    if (ticksWithNews === 0) return null;
    if (ticksWithNewsCall > 0) return null;
    return {
      confidence: ticksWithNews >= 2 ? "high" : "medium",
      evidence: [`${ticksWithNews} ticks had news arrive but get_news_feed was never called`],
    };
  },
  remediation: "Add to system prompt: 'When news arrives in the snapshot, always call get_news_feed before trading.'",
};

/** Never uses stop-loss skill */
const NO_STOP_LOSS: PatternRule = {
  id: "NO_STOP_LOSS",
  title: "No stop-loss discipline — never uses set_stop_loss",
  detect: (entries) => {
    const fills = entries.flatMap((e) => e.fills);
    if (fills.length < 2) return null;
    const stopUses = entries.filter((e) =>
      e.agent.toolCalls.some((tc) => tc.name === "set_stop_loss")
    ).length;
    if (stopUses > 0) return null;
    return {
      confidence: "medium",
      evidence: [`${fills.length} fills executed but set_stop_loss was never called`],
    };
  },
  remediation: "Consider adding stop-loss orders after entry to bound downside.",
};

/** Trades again within 1 tick of a losing trade (revenge trading / tilt) */
const TILTED_AFTER_LOSS: PatternRule = {
  id: "TILTED_AFTER_LOSS",
  title: "Tilted after loss — re-enters within 1 tick of a losing close",
  detect: (entries) => {
    const evidence: string[] = [];
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]!;
      const cur = entries[i]!;
      const prevHadLosingClose =
        prev.portfolio.realizedPnl < (entries[Math.max(0, i - 2)]?.portfolio.realizedPnl ?? 0);
      if (prevHadLosingClose && cur.fills.length > 0) {
        evidence.push(`tick ${cur.tick}: re-entered immediately after losing close at tick ${prev.tick}`);
      }
    }
    if (evidence.length === 0) return null;
    return {
      confidence: evidence.length >= 2 ? "high" : "medium",
      evidence: evidence.slice(0, 3),
    };
  },
  remediation: "Add to system prompt: 'After a losing close, wait at least 3 ticks and re-read market context before re-entering.'",
};

export const PATTERN_LIBRARY: PatternRule[] = [
  PANIC_SELLER,
  OVERTRADER,
  NEWS_BLIND,
  NO_STOP_LOSS,
  TILTED_AFTER_LOSS,
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/coach/src/pattern-library.ts
git commit -m "feat(coach): 5-pattern failure-mode library"
```

---

## Task 6: Pattern detection (mechanical Pass 3)

**Files:**
- Create: `packages/coach/src/pattern-detect.ts`
- Create: `packages/coach/test/pattern-detect.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/coach/test/pattern-detect.test.ts
import { describe, it, expect } from "vitest";
import { detectPatterns } from "../src/pattern-detect.js";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("detectPatterns", () => {
  it("detects PANIC_SELLER on the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    // The sample run sells 1 ETH during a sharp drop after Trump news.
    // Sample only has 1 sell, so detection ratio = 1/1 = 1.0 (above 0.4 threshold).
    const patterns = detectPatterns(run.entries);
    const ids = patterns.map((p) => p.patternId);
    expect(ids).toContain("PANIC_SELLER");
  });

  it("detects NEWS_BLIND on the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    // Sample never calls get_news_feed despite news arriving at tick 2.
    const patterns = detectPatterns(run.entries);
    const ids = patterns.map((p) => p.patternId);
    expect(ids).toContain("NEWS_BLIND");
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// packages/coach/src/pattern-detect.ts
import type { TraceEntry } from "@crucible/core";
import { PATTERN_LIBRARY } from "./pattern-library.js";
import type { PatternDetection } from "./types.js";

export function detectPatterns(entries: TraceEntry[]): PatternDetection[] {
  const detections: PatternDetection[] = [];
  for (const rule of PATTERN_LIBRARY) {
    const result = rule.detect(entries);
    if (result) {
      detections.push({
        patternId: rule.id,
        confidence: result.confidence,
        evidence: result.evidence,
        remediation: rule.remediation,
      });
    }
  }
  return detections;
}
```

- [ ] **Step 3: Verify, commit**

```bash
# Append `export * from "./pattern-detect.js"` to index.ts
pnpm --filter @crucible/coach test pattern-detect
git add packages/coach
git commit -m "feat(coach): pattern detection (Pass 3)"
```

---

## Task 7: 0G Compute Router client

**Files:**
- Create: `packages/coach/src/og-llm-client.ts`

- [ ] **Step 1: Implement og-llm-client.ts**

```typescript
import OpenAI from "openai";

export interface OgLlmConfig {
  baseURL: string;            // e.g., https://compute.0g.ai/v1 or https://router.0g.ai/v1
  apiKey: string;             // 0G Compute Router API key
  model: string;              // e.g., "gpt-4o-mini" or "claude-sonnet-4-6"
}

export class OgLlmClient {
  private client: OpenAI;
  constructor(private readonly cfg: OgLlmConfig) {
    this.client = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey });
  }

  async complete(systemPrompt: string, userPrompt: string, options?: {
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  }): Promise<string> {
    const resp = await this.client.chat.completions.create({
      model: this.cfg.model,
      max_tokens: options?.maxTokens ?? 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
    });
    return resp.choices[0]?.message?.content ?? "";
  }
}

/**
 * Construct from env vars.
 *
 * Verified endpoints (from docs.0g.ai, May 2026):
 *   - Mainnet:  https://router-api.0g.ai/v1
 *   - Testnet:  https://router-api-testnet.integratenetwork.work/v1
 *
 * API key is created at pc.0g.ai → Dashboard → API Keys (with "inference"
 * permission). It starts with "sk-".
 *
 * Browse the live model catalog (no auth):
 *   curl https://router-api.0g.ai/v1/models
 *
 * Default model uses one currently in the catalog; verify yours via the
 * catalog before relying on it.
 */
export function loadOgLlmFromEnv(): OgLlmClient {
  const baseURL = process.env.OG_COMPUTE_BASE_URL ?? "https://router-api.0g.ai/v1";
  const apiKey = process.env.OG_COMPUTE_API_KEY;
  const model = process.env.OG_COMPUTE_MODEL ?? "zai-org/GLM-5-FP8";
  if (!apiKey) throw new Error("Missing OG_COMPUTE_API_KEY env var (get one at pc.0g.ai)");
  return new OgLlmClient({ baseURL, apiKey, model });
}
```

- [ ] **Step 2: Commit**

```bash
# Append `export * from "./og-llm-client.js"` to index.ts
git add packages/coach/src/og-llm-client.ts packages/coach/src/index.ts
git commit -m "feat(coach): 0G Compute Router LLM client wrapper"
```

---

## Task 8: Decision-point critique (LLM Pass 2)

**Files:**
- Create: `packages/coach/src/decision-critique.ts`

- [ ] **Step 1: Implement decision-critique.ts**

```typescript
import { z } from "zod";
import type { TraceEntry } from "@crucible/core";
import type { OgLlmClient } from "./og-llm-client.js";
import type { DecisionPoint, DecisionCritique } from "./types.js";

/** Pick the 5-10 most consequential ticks by absolute PnL delta */
export function selectDecisionPoints(entries: TraceEntry[], k = 8): DecisionPoint[] {
  const ranked: { entry: TraceEntry; pnlDelta: number; reason: DecisionPoint["reason"] }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const cur = entries[i]!;
    const prev = entries[i - 1];
    const curEquity = cur.portfolio.cash + cur.portfolio.position * cur.market.last;
    const prevEquity = prev ? prev.portfolio.cash + prev.portfolio.position * prev.market.last : curEquity;
    const delta = curEquity - prevEquity;
    const reason: DecisionPoint["reason"] = cur.newsSeen.length > 0 ? "news_arrival" : "largest_pnl_delta";
    if (Math.abs(delta) > 0.001) {
      ranked.push({ entry: cur, pnlDelta: delta, reason });
    }
  }
  ranked.sort((a, b) => Math.abs(b.pnlDelta) - Math.abs(a.pnlDelta));
  return ranked.slice(0, k).map((r) => ({
    tick: r.entry.tick,
    ts: r.entry.ts,
    reason: r.reason,
    pnlDelta: r.pnlDelta,
    agentReasoning: r.entry.agent.completions.map((c) => c.content).join("\n"),
    marketContext: `mid=${r.entry.market.mid.toFixed(2)} drawdown=${(r.entry.portfolio.drawdownPct * 100).toFixed(2)}% position=${r.entry.portfolio.position}`,
  }));
}

const DecisionCritiqueSchema = z.object({
  critique: z.string(),
  recommendation: z.string(),
});

const SYSTEM_PROMPT = `You are a trading coach reviewing an AI trading agent's decisions. For each decision point, analyze:
1. What the agent reasoned about
2. What actually happened (market context, PnL impact)
3. Whether the reasoning was sound, given information available at that moment

Output strict JSON: { "critique": "<2-3 sentences>", "recommendation": "<1 sentence, actionable>" }

Phrase as observations, not commands. Reference specific evidence from the agent's own reasoning.`;

export async function critiqueDecisionPoints(
  llm: OgLlmClient,
  points: DecisionPoint[]
): Promise<DecisionCritique[]> {
  const critiques: DecisionCritique[] = [];
  for (const p of points) {
    const userPrompt = [
      `Decision point at tick ${p.tick} (${p.ts})`,
      `Reason flagged: ${p.reason}`,
      `PnL delta: ${p.pnlDelta.toFixed(2)}`,
      `Market context: ${p.marketContext}`,
      `Agent's reasoning at this tick:`,
      p.agentReasoning || "(no reasoning recorded)",
    ].join("\n");

    const raw = await llm.complete(SYSTEM_PROMPT, userPrompt, { responseFormat: "json_object", maxTokens: 512 });
    try {
      const parsed = DecisionCritiqueSchema.parse(JSON.parse(raw));
      critiques.push({ tick: p.tick, ...parsed });
    } catch {
      critiques.push({
        tick: p.tick,
        critique: `(coach: failed to parse LLM output) raw: ${raw.slice(0, 200)}`,
        recommendation: "(no recommendation)",
      });
    }
  }
  return critiques;
}
```

- [ ] **Step 2: Commit**

```bash
# Append re-export to index.ts
git add packages/coach/src/decision-critique.ts packages/coach/src/index.ts
git commit -m "feat(coach): decision-point critique LLM pass (Pass 2)"
```

---

## Task 9: Synthesis (LLM Pass 5)

**Files:**
- Create: `packages/coach/src/synthesis.ts`

- [ ] **Step 1: Implement synthesis.ts**

```typescript
import { z } from "zod";
import type { OgLlmClient } from "./og-llm-client.js";
import type { TradeCritique, DecisionCritique, PatternDetection, CoachSuggestion } from "./types.js";

const SuggestionSchema = z.object({
  rank: z.number().int().min(1),
  title: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  rationale: z.string(),
  promptEditSuggestion: z.string().optional(),
  verificationStep: z.string(),
});
const SuggestionsSchema = z.object({ suggestions: z.array(SuggestionSchema) });

const SYSTEM_PROMPT = `You are synthesizing observations into a ranked list of improvement suggestions for an AI trading agent.

Input: trade critiques, decision critiques, detected patterns, plus the agent's current system prompt (if provided).
Output strict JSON: { "suggestions": [{ "rank": 1, "title": "...", "impact": "high|medium|low", "rationale": "...", "promptEditSuggestion": "concrete text to add to system prompt", "verificationStep": "how to verify the change worked" }, ...] }

Rules:
- Top 3-5 suggestions, ranked by expected impact
- Each suggestion must be actionable and specific
- Reference evidence from the inputs (e.g., "panic seller pattern detected with high confidence")
- promptEditSuggestion should be a concrete sentence the user could paste into their system_prompt
- verificationStep should describe how to confirm the change (e.g., "re-run on scenario X, expect Sortino > 0.5")`;

export async function synthesize(
  llm: OgLlmClient,
  tradeCritiques: TradeCritique[],
  decisionCritiques: DecisionCritique[],
  patterns: PatternDetection[],
  currentSystemPrompt?: string
): Promise<CoachSuggestion[]> {
  const userPrompt = JSON.stringify(
    {
      tradeCritiques,
      decisionCritiques,
      patterns,
      currentSystemPrompt: currentSystemPrompt ?? "(not provided)",
    },
    null,
    2
  );
  const raw = await llm.complete(SYSTEM_PROMPT, userPrompt, { responseFormat: "json_object", maxTokens: 2048 });
  try {
    const parsed = SuggestionsSchema.parse(JSON.parse(raw));
    return parsed.suggestions.sort((a, b) => a.rank - b.rank);
  } catch (err) {
    return [{
      rank: 1,
      title: "(coach: synthesis failed)",
      impact: "low",
      rationale: `Raw LLM output: ${raw.slice(0, 500)}`,
      verificationStep: "Re-run coach with verbose logs.",
    }];
  }
}
```

- [ ] **Step 2: Commit**

```bash
# Append re-export to index.ts
git add packages/coach/src/synthesis.ts packages/coach/src/index.ts
git commit -m "feat(coach): synthesis LLM pass (Pass 5)"
```

---

## Task 10: Markdown report renderer

**Files:**
- Create: `packages/coach/src/render.ts`
- Create: `packages/coach/test/render.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/coach/test/render.test.ts
import { describe, it, expect } from "vitest";
import { renderReport } from "../src/render.js";
import type { CoachReport } from "../src/types.js";

const sample: CoachReport = {
  runId: "test-run-1",
  scenarioId: "scenario-1",
  recipeName: "agent-A",
  scorecard: { sortino: 0.31, maxDrawdownPct: -0.184, totalReturnPct: -0.121, winRate: 0.4 },
  tradeCritiques: [],
  decisionCritiques: [],
  patternsDetected: [{
    patternId: "PANIC_SELLER",
    confidence: "high",
    evidence: ["tick 2: panic sold"],
    remediation: "Don't panic sell.",
  }],
  topSuggestions: [{
    rank: 1,
    title: "Stop panic selling",
    impact: "high",
    rationale: "Detected with high confidence.",
    promptEditSuggestion: "Add to system prompt: do not panic sell.",
    verificationStep: "Re-run scenario, expect higher Sortino.",
  }],
  rawTrace: [],
};

describe("renderReport", () => {
  it("renders a coach report as markdown", () => {
    const md = renderReport(sample);
    expect(md).toContain("# Coach Report");
    expect(md).toContain("agent-A");
    expect(md).toContain("PANIC_SELLER");
    expect(md).toContain("Stop panic selling");
    expect(md).toContain("Top 3 issues");
  });
});
```

- [ ] **Step 2: Implement render.ts**

```typescript
import type { CoachReport } from "./types.js";

export function renderReport(r: CoachReport): string {
  const lines: string[] = [];
  lines.push(`# Coach Report`);
  lines.push("");
  lines.push(`**Run:** \`${r.runId}\``);
  lines.push(`**Scenario:** \`${r.scenarioId}\``);
  lines.push(`**Recipe:** \`${r.recipeName}\``);
  lines.push("");
  lines.push(`## Scorecard`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Sortino | ${r.scorecard.sortino.toFixed(4)} |`);
  lines.push(`| Max drawdown | ${(Math.abs(r.scorecard.maxDrawdownPct) * 100).toFixed(2)}% |`);
  lines.push(`| Total return | ${(r.scorecard.totalReturnPct * 100).toFixed(2)}% |`);
  lines.push(`| Win rate | ${(r.scorecard.winRate * 100).toFixed(1)}% |`);
  lines.push("");
  lines.push(`## Top ${Math.min(3, r.topSuggestions.length)} issues`);
  lines.push("");
  for (const s of r.topSuggestions.slice(0, 3)) {
    lines.push(`### ${s.rank}. ${s.title} *(${s.impact} impact)*`);
    lines.push("");
    lines.push(s.rationale);
    if (s.promptEditSuggestion) {
      lines.push("");
      lines.push(`**Suggested prompt edit:**`);
      lines.push("");
      lines.push("```");
      lines.push(s.promptEditSuggestion);
      lines.push("```");
    }
    lines.push("");
    lines.push(`**Verify:** ${s.verificationStep}`);
    lines.push("");
  }
  if (r.patternsDetected.length > 0) {
    lines.push(`## Patterns detected`);
    lines.push("");
    for (const p of r.patternsDetected) {
      lines.push(`### ${p.patternId} *(confidence: ${p.confidence})*`);
      lines.push("");
      for (const e of p.evidence) lines.push(`- ${e}`);
      lines.push("");
      lines.push(`**Remediation:** ${p.remediation}`);
      lines.push("");
    }
  }
  if (r.decisionCritiques.length > 0) {
    lines.push(`## Decision-by-decision critique`);
    lines.push("");
    for (const d of r.decisionCritiques) {
      lines.push(`### Tick ${d.tick}`);
      lines.push("");
      lines.push(d.critique);
      lines.push("");
      lines.push(`**Recommendation:** ${d.recommendation}`);
      lines.push("");
    }
  }
  if (r.tradeCritiques.length > 0) {
    lines.push(`## Trade observations`);
    lines.push("");
    for (const t of r.tradeCritiques) {
      lines.push(`- ${t.observation}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
```

- [ ] **Step 3: Verify, commit**

```bash
# Append re-export to index.ts
pnpm --filter @crucible/coach test render
git add packages/coach
git commit -m "feat(coach): markdown report renderer"
```

---

## Task 11: Top-level coach orchestrator

**Files:**
- Create: `packages/coach/src/coach.ts`

- [ ] **Step 1: Implement coach.ts**

```typescript
import { loadRun } from "./trace-reader.js";
import { computeTradeCritiques } from "./trade-critique.js";
import { detectPatterns } from "./pattern-detect.js";
import { selectDecisionPoints, critiqueDecisionPoints } from "./decision-critique.js";
import { synthesize } from "./synthesis.js";
import { renderReport } from "./render.js";
import { loadOgLlmFromEnv, type OgLlmClient } from "./og-llm-client.js";
import type { CoachReport } from "./types.js";

export interface CoachOpts {
  runDir: string;
  llm?: OgLlmClient;
  systemPromptForContext?: string;
}

export async function runCoach(opts: CoachOpts): Promise<{ report: CoachReport; markdown: string }> {
  const run = await loadRun(opts.runDir);
  const llm = opts.llm ?? loadOgLlmFromEnv();

  const tradeCritiques = computeTradeCritiques(run.entries);
  const patterns = detectPatterns(run.entries);

  const decisionPoints = selectDecisionPoints(run.entries, 8);
  const decisionCritiques = await critiqueDecisionPoints(llm, decisionPoints);

  const suggestions = await synthesize(
    llm,
    tradeCritiques,
    decisionCritiques,
    patterns,
    opts.systemPromptForContext
  );

  const report: CoachReport = {
    runId: opts.runDir.split("/").pop() ?? "unknown",
    scenarioId: run.scenarioId,
    recipeName: run.recipeName,
    scorecard: run.scorecard.scorecard,
    tradeCritiques,
    decisionCritiques,
    patternsDetected: patterns,
    topSuggestions: suggestions,
    rawTrace: run.entries,
  };

  return { report, markdown: renderReport(report) };
}
```

- [ ] **Step 2: Commit**

```bash
# Append `export * from "./coach.js";` to index.ts
git add packages/coach
git commit -m "feat(coach): top-level coach orchestrator"
```

---

## Task 12: Wire `crucible coach` CLI subcommand

**Files:**
- Modify: `apps/cli/package.json` (add @crucible/coach workspace dep)
- Create: `apps/cli/src/coach.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Add dep**

In `apps/cli/package.json`, add to `dependencies`:
```json
"@crucible/coach": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 2: Implement coach command**

`apps/cli/src/coach.ts`:
```typescript
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runCoach } from "@crucible/coach";

export interface CoachOpts {
  runDir: string;
  systemPrompt?: string;
}

export async function coachCommand(opts: CoachOpts): Promise<void> {
  const { markdown } = await runCoach({ runDir: opts.runDir, systemPromptForContext: opts.systemPrompt });
  const outPath = path.join(opts.runDir, "coach-report.md");
  await writeFile(outPath, markdown);
  console.log(`Coach report written to: ${outPath}`);
  console.log("");
  console.log(markdown.split("\n").slice(0, 30).join("\n"));
  console.log("...");
}
```

- [ ] **Step 3: Wire into CLI**

Modify `apps/cli/src/index.ts` — add a `coach` subcommand:

```typescript
import { coachCommand } from "./coach.js";

// ... after the run command:
program
  .command("coach")
  .description("Analyze a run directory and produce a coach-report.md")
  .requiredOption("-r, --run-dir <path>", "Path to a run directory (containing trace.jsonl + scorecard.json)")
  .option("-p, --system-prompt <text>", "Optional: the agent's system prompt for richer suggestions")
  .action(async (opts) => {
    await coachCommand({ runDir: opts.runDir, systemPrompt: opts.systemPrompt });
  });
```

- [ ] **Step 4: Sanity-run help**

```bash
pnpm --filter @crucible/cli start coach --help
```

Expected: prints help for the `coach` subcommand.

- [ ] **Step 5: Commit**

```bash
git add apps/cli/package.json apps/cli/src/coach.ts apps/cli/src/index.ts pnpm-lock.yaml
git commit -m "feat(cli): wire crucible coach subcommand using @crucible/coach"
```

---

## Task 13: Smoke test the coach (mock LLM)

**Files:**
- Create: `packages/coach/test/coach.test.ts`

- [ ] **Step 1: Write a smoke test using a mock OgLlmClient**

```typescript
import { describe, it, expect } from "vitest";
import { runCoach } from "../src/coach.js";
import type { OgLlmClient } from "../src/og-llm-client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MockLlmClient {
  async complete(_sys: string, _user: string, opts?: { responseFormat?: "text" | "json_object" }): Promise<string> {
    if (opts?.responseFormat === "json_object") {
      if (_sys.includes("synthesizing")) {
        return JSON.stringify({
          suggestions: [{
            rank: 1, title: "Stop panic selling", impact: "high",
            rationale: "Detected panic seller pattern.",
            promptEditSuggestion: "Do not sell on drawdowns below 5%.",
            verificationStep: "Re-run scenario, expect win_rate > 0.5",
          }],
        });
      }
      return JSON.stringify({ critique: "Agent panic-sold on news.", recommendation: "Reassess thesis before selling." });
    }
    return "text response";
  }
}

describe("runCoach (mock LLM)", () => {
  it("produces a coach report end-to-end", async () => {
    const runDir = path.join(__dirname, "fixtures/sample-run");
    const { report, markdown } = await runCoach({
      runDir,
      llm: new MockLlmClient() as unknown as OgLlmClient,
    });
    expect(report.patternsDetected.map((p) => p.patternId)).toContain("PANIC_SELLER");
    expect(report.topSuggestions.length).toBeGreaterThan(0);
    expect(markdown).toContain("# Coach Report");
    expect(markdown).toContain("Stop panic selling");
  });
});
```

- [ ] **Step 2: Verify, commit**

```bash
pnpm --filter @crucible/coach test coach
git add packages/coach/test/coach.test.ts
git commit -m "test(coach): end-to-end smoke with mock LLM"
```

---

## Task 14: Live coach verification (manual)

This task requires `OG_COMPUTE_API_KEY` in the environment.

- [ ] **Step 1: Set env**

```bash
# Get an API key at pc.0g.ai → Dashboard → API Keys (inference permission).
export OG_COMPUTE_API_KEY=sk-...
# Mainnet (default — matches Plan 3's mainnet deployment).
export OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
# For testnet experimentation use:
#   export OG_COMPUTE_BASE_URL=https://router-api-testnet.integratenetwork.work/v1
# Pick a model from the live catalog (curl https://router-api.0g.ai/v1/models).
export OG_COMPUTE_MODEL=zai-org/GLM-5-FP8
```

- [ ] **Step 2: Run against a real trace**

```bash
# Assuming you've already done crucible run from Plan 1 Task 16:
pnpm --filter @crucible/cli start coach --run-dir runs/baseline-claude_synthetic-eth-flash-crash_<ts>
```

Expected: completes in 30-90s, writes `coach-report.md` to the run dir, prints first ~30 lines.

- [ ] **Step 3: Commit a sample report**

```bash
cp runs/baseline-claude_*/coach-report.md samples/baseline-coach-report.md
git add samples
git commit -m "docs: sample coach report from baseline-claude run"
```

---

## Self-Review Checklist

1. **Spec coverage (Plan 2):** trace reader ✓, trade critique ✓, pattern library ✓, pattern detection ✓, 0G Compute Router client ✓, decision critique LLM pass ✓, synthesis LLM pass ✓, markdown renderer ✓, coach orchestrator ✓, `crucible coach` CLI ✓.
2. **Out of scope:** recipe-diff vs top-3 performers (no leaderboard yet — Plan 5), one-click rerun (UI — Plan 4), more than 5 failure-mode patterns.
3. **Placeholders:** none. Every step has actual code or commands.
4. **Type consistency:** CoachReport, TradeCritique, etc. defined once in types.ts and used everywhere.
