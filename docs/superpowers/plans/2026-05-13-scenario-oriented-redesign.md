# Scenario-Oriented Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `apps/web` around scenarios, ship a 6-scenario launch catalog (mix historical + synthetic), and add a build-time data pipeline that fetches real market data deterministically.

**Architecture:** New `@crucible/scenario-builder` package fetches Binance klines / runs synthetic generators and writes deterministic bundles to `scenarios/<id>/`. Existing `Manifest` schema gains optional fields (`kind`, `difficulty`, `tags`, `description`, `tests`, `data_source`, `news_source`) — backward compatible. `apps/web` gets new routes (`/`, `/scenarios`, `/scenarios/[id]`, `/community`), the current leaderboard moves to `/leaderboard`, six new ui-kit components support the chart-as-hero card design.

**Tech Stack:** TypeScript ESM, pnpm workspace, Node 22+, Vitest, Zod, Next.js 14 App Router, Tailwind 3, lightweight-charts, IBM Plex Mono + Inter, ethers v6 (existing). Build-time network: Binance public REST (`api.binance.com/api/v3/klines`, no auth).

**Conventions enforced**:
- Bundle files are NDJSON (`.jsonl`), matching existing `synthetic-eth-flash-crash`. NOT JSON arrays.
- Existing `NewsItem` shape from `packages/core/src/types.ts`: `{ ts, headline, body, source }`. No `id` or `tick` fields.
- All ui-kit components export from `packages/ui-kit/src/index.ts` and import sibling files **without `.js` extensions** (matches `transpilePackages` config in Next).
- All new pure-logic modules in `@crucible/scenario-builder` get a sibling `.test.ts` file. New UI components do **not** get unit tests (matches existing ui-kit pattern); they're verified via browser smoke test at the end.
- Commits omit `Co-Authored-By` (user preference, saved in memory).

---

## Phase A — Builder Package

### Task 1: Bootstrap `@crucible/scenario-builder` package

**Files:**
- Create: `packages/scenario-builder/package.json`
- Create: `packages/scenario-builder/tsconfig.json`
- Create: `packages/scenario-builder/src/index.ts`
- Create: `packages/scenario-builder/vitest.config.ts`
- Modify: `pnpm-workspace.yaml` (if it doesn't already include `packages/*`)

- [ ] **Step 1: Create the package.json**

```json
{
  "name": "@crucible/scenario-builder",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "bin": {
    "crucible-build-scenarios": "./src/cli.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "build:scenarios": "tsx src/cli.ts"
  },
  "dependencies": {
    "@crucible/core": "workspace:*",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
```

- [ ] **Step 4: Create src/index.ts placeholder**

```ts
export {};
```

- [ ] **Step 5: Install & verify**

Run: `pnpm install`
Expected: success, no errors.

Run: `pnpm --filter @crucible/scenario-builder typecheck`
Expected: success (zero output).

- [ ] **Step 6: Commit**

```bash
git add packages/scenario-builder pnpm-workspace.yaml
git commit -m "feat(scenario-builder): bootstrap package skeleton"
```

---

### Task 2: Klines → Ticks converter (TDD)

**Files:**
- Create: `packages/scenario-builder/src/klines-to-ticks.ts`
- Create: `packages/scenario-builder/src/klines-to-ticks.test.ts`

**Background**: Binance REST returns klines as arrays: `[openTime, open, high, low, close, volume, closeTime, ...]`. We need to emit one `Tick` per kline. Mid = (open+close)/2. Bid/ask synthesized from a `bps_spread` (default 5 bps). `last` = close. `volume` = parsed float.

- [ ] **Step 1: Write the failing test**

```ts
// klines-to-ticks.test.ts
import { describe, it, expect } from "vitest";
import { klinesToTicks } from "./klines-to-ticks";

describe("klinesToTicks", () => {
  it("converts a single kline to a Tick with synthesized bid/ask", () => {
    const klines: unknown[][] = [
      [1704988800000, "3500.0", "3510.0", "3490.0", "3505.0", "12.5", 1704988859999, "0", 0, "0", "0", "0"],
    ];
    const ticks = klinesToTicks(klines, 5); // 5 bps spread
    expect(ticks).toHaveLength(1);
    expect(ticks[0]!.ts).toBe("2024-01-11T16:00:00.000Z");
    expect(ticks[0]!.mid).toBeCloseTo(3502.5, 4);     // (3500 + 3505) / 2
    expect(ticks[0]!.last).toBeCloseTo(3505.0, 4);
    expect(ticks[0]!.volume).toBeCloseTo(12.5, 4);
    // 5 bps half-spread from mid 3502.5 = 0.876 → bid ~3501.62, ask ~3503.38
    expect(ticks[0]!.bid).toBeCloseTo(3502.5 * (1 - 0.0005 / 2), 4);
    expect(ticks[0]!.ask).toBeCloseTo(3502.5 * (1 + 0.0005 / 2), 4);
  });

  it("preserves order across multiple klines", () => {
    const klines: unknown[][] = [
      [1000, "100", "101", "99", "100.5", "1", 0, "0", 0, "0", "0", "0"],
      [2000, "100.5", "102", "100", "101", "2", 0, "0", 0, "0", "0", "0"],
    ];
    const ticks = klinesToTicks(klines, 1);
    expect(ticks.map((t) => t.ts)).toEqual(["1970-01-01T00:00:01.000Z", "1970-01-01T00:00:02.000Z"]);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm --filter @crucible/scenario-builder test`
Expected: FAIL — `Cannot find module './klines-to-ticks'`.

- [ ] **Step 3: Implement**

```ts
// klines-to-ticks.ts
import type { Tick } from "@crucible/core";

/** Convert Binance klines (REST raw rows) into a Tick[]. */
export function klinesToTicks(klines: unknown[][], bpsSpread: number): Tick[] {
  return klines.map((k) => {
    const openTime = Number(k[0]);
    const open = parseFloat(k[1] as string);
    const close = parseFloat(k[4] as string);
    const volume = parseFloat(k[5] as string);
    const mid = (open + close) / 2;
    const halfSpread = bpsSpread / 10000 / 2;
    return {
      ts: new Date(openTime).toISOString(),
      mid,
      bid: mid * (1 - halfSpread),
      ask: mid * (1 + halfSpread),
      last: close,
      volume,
    };
  });
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm --filter @crucible/scenario-builder test`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/scenario-builder/src/klines-to-ticks.ts packages/scenario-builder/src/klines-to-ticks.test.ts
git commit -m "feat(scenario-builder): klines → ticks converter with bps-spread synthesis"
```

---

### Task 3: Synthetic generators (TDD)

**Files:**
- Create: `packages/scenario-builder/src/synthetic.ts`
- Create: `packages/scenario-builder/src/synthetic.test.ts`

**Background**: Three programmatic generators (`choppy`, `fakeout`, `liquidity-crisis`) that produce `Tick[]` series matching the spec's chart patterns. Pure functions, fully deterministic via seeded PRNG.

- [ ] **Step 1: Write the failing test**

```ts
// synthetic.test.ts
import { describe, it, expect } from "vitest";
import { generateChoppy, generateFakeout, generateLiquidityCrisis } from "./synthetic";

describe("synthetic generators", () => {
  it("choppy produces N ticks bounded around the basePrice", () => {
    const ticks = generateChoppy({
      ticks: 200,
      tickIntervalMs: 1000,
      startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500,
      bandPct: 0.003,
      seed: 42,
    });
    expect(ticks).toHaveLength(200);
    for (const t of ticks) {
      expect(t.mid).toBeGreaterThan(3500 * 0.99);
      expect(t.mid).toBeLessThan(3500 * 1.01);
    }
    // deterministic with seed
    const again = generateChoppy({ ticks: 200, tickIntervalMs: 1000, startTs: "2026-01-01T00:00:00Z", basePrice: 3500, bandPct: 0.003, seed: 42 });
    expect(again[100]!.mid).toBe(ticks[100]!.mid);
  });

  it("fakeout pumps to ~+5% then collapses to ~-3%", () => {
    const ticks = generateFakeout({
      ticks: 150,
      tickIntervalMs: 1000,
      startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500,
      pumpPct: 0.05,
      reversePct: -0.03,
      pumpStart: 40,
      pumpEnd: 70,
      seed: 7,
    });
    expect(ticks).toHaveLength(150);
    // Around the pump peak (tick 70), price near +5%
    expect(ticks[70]!.mid).toBeGreaterThan(3500 * 1.04);
    expect(ticks[70]!.mid).toBeLessThan(3500 * 1.06);
    // End around -3%
    expect(ticks[149]!.mid).toBeGreaterThan(3500 * 0.96);
    expect(ticks[149]!.mid).toBeLessThan(3500 * 0.98);
  });

  it("liquidity-crisis drifts down ~2% with stable ts spacing", () => {
    const ticks = generateLiquidityCrisis({
      ticks: 200,
      tickIntervalMs: 1000,
      startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500,
      driftPct: -0.02,
      seed: 13,
    });
    expect(ticks).toHaveLength(200);
    expect(ticks[199]!.mid).toBeGreaterThan(3500 * 0.97);
    expect(ticks[199]!.mid).toBeLessThan(3500 * 0.99);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm --filter @crucible/scenario-builder test synthetic`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// synthetic.ts
import type { Tick } from "@crucible/core";

interface BaseOpts {
  ticks: number;
  tickIntervalMs: number;
  startTs: string;
  basePrice: number;
  seed: number;
}

/** Linear-congruential PRNG for deterministic outputs without bringing in a lib. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeTick(ts: string, price: number, bpsSpread = 5): Tick {
  const halfSpread = bpsSpread / 10000 / 2;
  return {
    ts,
    mid: price,
    bid: price * (1 - halfSpread),
    ask: price * (1 + halfSpread),
    last: price,
    volume: 1,
  };
}

export function generateChoppy(opts: BaseOpts & { bandPct: number }): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    const phase = (i / opts.ticks) * Math.PI * 4;
    const noise = (rng() - 0.5) * 2 * 0.001;
    const price = opts.basePrice * (1 + Math.sin(phase) * opts.bandPct + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}

export function generateFakeout(opts: BaseOpts & {
  pumpPct: number;
  reversePct: number;
  pumpStart: number;
  pumpEnd: number;
}): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    let pct = 0;
    if (i < opts.pumpStart) {
      pct = 0;
    } else if (i <= opts.pumpEnd) {
      // Linear ramp up
      const t = (i - opts.pumpStart) / (opts.pumpEnd - opts.pumpStart);
      pct = t * opts.pumpPct;
    } else {
      // Collapse from pumpPct to reversePct over remaining ticks
      const t = (i - opts.pumpEnd) / (opts.ticks - 1 - opts.pumpEnd);
      pct = opts.pumpPct + (opts.reversePct - opts.pumpPct) * t;
    }
    const noise = (rng() - 0.5) * 2 * 0.001;
    const price = opts.basePrice * (1 + pct + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}

export function generateLiquidityCrisis(opts: BaseOpts & { driftPct: number }): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    const t = i / (opts.ticks - 1);
    const drift = t * opts.driftPct;
    const noise = (rng() - 0.5) * 2 * 0.0015;
    const price = opts.basePrice * (1 + drift + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter @crucible/scenario-builder test`
Expected: PASS — 5 tests total now.

- [ ] **Step 5: Commit**

```bash
git add packages/scenario-builder/src/synthetic.ts packages/scenario-builder/src/synthetic.test.ts
git commit -m "feat(scenario-builder): deterministic synthetic generators (choppy / fakeout / liquidity-crisis)"
```

---

### Task 4: Binance fetcher (with mock)

**Files:**
- Create: `packages/scenario-builder/src/fetch-binance.ts`
- Create: `packages/scenario-builder/src/fetch-binance.test.ts`

**Background**: Binance klines REST returns at most 1000 rows per request. For long windows, we paginate by stepping `startTime` forward. We mock `fetch` in the test.

- [ ] **Step 1: Write the failing test**

```ts
// fetch-binance.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBinanceKlines } from "./fetch-binance";

describe("fetchBinanceKlines", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("paginates when window exceeds 1000 klines", async () => {
    const mockedFetch = vi.mocked(fetch);
    const row = (openTime: number) => [openTime, "1", "1.1", "0.9", "1.05", "1", openTime + 999, "0", 0, "0", "0", "0"];
    // First page: 1000 rows (1000ms apart)
    const page1 = Array.from({ length: 1000 }, (_, i) => row(1_000_000 + i * 1000));
    const page2 = Array.from({ length: 200 }, (_, i) => row(2_000_000 + i * 1000));
    mockedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(page1)))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2)));

    const rows = await fetchBinanceKlines({
      symbol: "ETHUSDT",
      interval: "1s",
      startMs: 1_000_000,
      endMs: 2_200_000,
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(1200);
  });

  it("stops paging when response is empty", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify([])));
    const rows = await fetchBinanceKlines({ symbol: "ETHUSDT", interval: "1s", startMs: 0, endMs: 1000 });
    expect(rows).toEqual([]);
  });

  it("throws on non-200 response", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce(new Response("ratelimit", { status: 429 }));
    await expect(
      fetchBinanceKlines({ symbol: "ETHUSDT", interval: "1s", startMs: 0, endMs: 1000 })
    ).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter @crucible/scenario-builder test fetch-binance`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// fetch-binance.ts
export interface FetchKlinesOpts {
  symbol: string;
  interval: string;   // e.g. "1s", "1m", "10s" → mapped to Binance accepted values
  startMs: number;
  endMs: number;
}

const BASE = "https://api.binance.com/api/v3/klines";
const PAGE_LIMIT = 1000;

/** Map a tick_interval_ms-friendly label to Binance's accepted interval string. */
function normalizeInterval(interval: string): string {
  // Binance does NOT accept "1s", "10s", "30s" — only ≥1m.
  // For sub-minute granularity, the build script falls back to "1m" and the
  // caller re-samples or accepts coarser data. (See klines-to-ticks docs.)
  if (interval.endsWith("s")) return "1m";
  return interval;
}

export async function fetchBinanceKlines(opts: FetchKlinesOpts): Promise<unknown[][]> {
  const out: unknown[][] = [];
  let cursor = opts.startMs;
  const binanceInterval = normalizeInterval(opts.interval);
  while (cursor < opts.endMs) {
    const url = `${BASE}?symbol=${opts.symbol}&interval=${binanceInterval}&startTime=${cursor}&endTime=${opts.endMs}&limit=${PAGE_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance klines fetch failed: ${res.status} ${res.statusText}`);
    }
    const page = (await res.json()) as unknown[][];
    if (page.length === 0) break;
    out.push(...page);
    const lastOpenTime = Number(page[page.length - 1]![0]);
    if (page.length < PAGE_LIMIT) break;
    cursor = lastOpenTime + 1;
  }
  return out;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @crucible/scenario-builder test fetch-binance`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/scenario-builder/src/fetch-binance.ts packages/scenario-builder/src/fetch-binance.test.ts
git commit -m "feat(scenario-builder): paginated Binance klines fetcher with rate-limit handling"
```

---

### Task 5: News mapper (TDD)

**Files:**
- Create: `packages/scenario-builder/src/news-mapper.ts`
- Create: `packages/scenario-builder/src/news-mapper.test.ts`

**Background**: Input recipes have `news[].at` as ISO timestamps. The runtime existing `NewsItem` shape doesn't carry a `tick` field — the engine matches by `ts`. We just need to write `news.jsonl` with `{ts, headline, body, source}` rows. This module validates the input and produces the output records.

- [ ] **Step 1: Write the failing test**

```ts
// news-mapper.test.ts
import { describe, it, expect } from "vitest";
import { mapInputNews } from "./news-mapper";
import type { Tick } from "@crucible/core";

const tick = (ts: string): Tick => ({ ts, mid: 100, bid: 99.95, ask: 100.05, last: 100, volume: 1 });

describe("mapInputNews", () => {
  it("snaps each news entry to the nearest tick timestamp", () => {
    const ticks = [tick("2024-01-01T00:00:00.000Z"), tick("2024-01-01T00:00:10.000Z"), tick("2024-01-01T00:00:20.000Z")];
    const news = mapInputNews(
      [{ at: "2024-01-01T00:00:09.999Z", headline: "X", source: "Y", body: "B" }],
      ticks,
    );
    expect(news).toHaveLength(1);
    expect(news[0]!.ts).toBe("2024-01-01T00:00:10.000Z");
    expect(news[0]!.headline).toBe("X");
    expect(news[0]!.source).toBe("Y");
    expect(news[0]!.body).toBe("B");
  });

  it("defaults body to empty string", () => {
    const ticks = [tick("2024-01-01T00:00:00Z")];
    const news = mapInputNews([{ at: "2024-01-01T00:00:00Z", headline: "H", source: "S" }], ticks);
    expect(news[0]!.body).toBe("");
  });

  it("drops news outside the tick window", () => {
    const ticks = [tick("2024-01-01T00:00:10Z"), tick("2024-01-01T00:00:20Z")];
    const news = mapInputNews(
      [
        { at: "2023-12-31T23:00:00Z", headline: "before", source: "X" },
        { at: "2024-01-02T00:00:00Z", headline: "after", source: "X" },
      ],
      ticks,
    );
    expect(news).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter @crucible/scenario-builder test news-mapper`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// news-mapper.ts
import type { NewsItem, Tick } from "@crucible/core";

export interface InputNews {
  at: string;
  headline: string;
  source: string;
  body?: string;
}

export function mapInputNews(items: InputNews[], ticks: Tick[]): NewsItem[] {
  if (ticks.length === 0) return [];
  const tickTimes = ticks.map((t) => new Date(t.ts).getTime());
  const firstT = tickTimes[0]!;
  const lastT = tickTimes[tickTimes.length - 1]!;
  const out: NewsItem[] = [];
  for (const n of items) {
    const at = new Date(n.at).getTime();
    if (at < firstT || at > lastT) continue;
    // Find the nearest tick by absolute distance.
    let bestIdx = 0;
    let bestDist = Math.abs(at - tickTimes[0]!);
    for (let i = 1; i < tickTimes.length; i++) {
      const d = Math.abs(at - tickTimes[i]!);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    out.push({ ts: ticks[bestIdx]!.ts, headline: n.headline, body: n.body ?? "", source: n.source });
  }
  return out;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @crucible/scenario-builder test news-mapper`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/scenario-builder/src/news-mapper.ts packages/scenario-builder/src/news-mapper.test.ts
git commit -m "feat(scenario-builder): news mapper snaps headlines to nearest tick"
```

---

### Task 6: Bundle writer + content hash (TDD)

**Files:**
- Create: `packages/scenario-builder/src/build-bundle.ts`
- Create: `packages/scenario-builder/src/build-bundle.test.ts`

**Background**: Writes the three files (`manifest.yaml`, `ticks.jsonl`, `news.jsonl`) and computes a content hash over canonical JSON of ticks + news. The hash goes into the manifest before write.

- [ ] **Step 1: Write the failing test**

```ts
// build-bundle.test.ts
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { computeContentHash, writeBundle } from "./build-bundle";

describe("computeContentHash", () => {
  it("is deterministic for identical ticks + news", () => {
    const ticks = [{ ts: "2024-01-01T00:00:00Z", mid: 100, bid: 99, ask: 101, last: 100, volume: 1 }];
    const news = [{ ts: "2024-01-01T00:00:00Z", headline: "h", body: "", source: "s" }];
    const a = computeContentHash(ticks, news);
    const b = computeContentHash(ticks, news);
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("differs when ticks change", () => {
    const news: never[] = [];
    const a = computeContentHash([{ ts: "x", mid: 1, bid: 1, ask: 1, last: 1, volume: 1 }], news);
    const b = computeContentHash([{ ts: "x", mid: 2, bid: 2, ask: 2, last: 2, volume: 2 }], news);
    expect(a).not.toBe(b);
  });
});

describe("writeBundle", () => {
  it("writes manifest.yaml, ticks.jsonl, news.jsonl", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "crucible-bundle-"));
    await writeBundle(dir, {
      manifest: {
        id: "test", title: "Test", asset: "ETH-USD",
        window: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:00:01Z" },
        tick_interval_ms: 1000, duration_ticks: 1, starting_cash_usd: 10000, starting_position: 0,
        scoring: { primary: "sortino_ratio", secondary: ["max_drawdown_pct"] },
        slippage: { base_bps: 1, impact_coeff: 5 },
        content_hash: "0x" + "0".repeat(64),
        visibility: "public",
        budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20, wall_clock_ms_per_tick: 30000 },
        kind: "synthetic", difficulty: 2, tags: ["test"],
        description: "desc", tests: "tests",
      },
      ticks: [{ ts: "2024-01-01T00:00:00Z", mid: 100, bid: 99.95, ask: 100.05, last: 100, volume: 1 }],
      news: [{ ts: "2024-01-01T00:00:00Z", headline: "H", body: "", source: "S" }],
    });

    const manifestRaw = await readFile(path.join(dir, "manifest.yaml"), "utf8");
    expect(manifestRaw).toContain("id: test");
    expect(manifestRaw).toContain("kind: synthetic");

    const ticksRaw = await readFile(path.join(dir, "ticks.jsonl"), "utf8");
    expect(ticksRaw.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(ticksRaw.trim().split("\n")[0]!).mid).toBe(100);

    const newsRaw = await readFile(path.join(dir, "news.jsonl"), "utf8");
    expect(newsRaw.trim().split("\n")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter @crucible/scenario-builder test build-bundle`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// build-bundle.ts
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { Tick, NewsItem } from "@crucible/core";

/** SHA-256 over canonical JSON of ticks + news. 0x-prefixed hex. */
export function computeContentHash(ticks: Tick[], news: NewsItem[]): string {
  const canonical = JSON.stringify({ ticks, news });
  const h = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `0x${h}`;
}

export interface WriteBundleInput {
  manifest: Record<string, unknown>;
  ticks: Tick[];
  news: NewsItem[];
}

export async function writeBundle(dir: string, input: WriteBundleInput): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "manifest.yaml"),
    yaml.dump(input.manifest, { lineWidth: -1, sortKeys: false }),
    "utf8",
  );
  await writeFile(
    path.join(dir, "ticks.jsonl"),
    input.ticks.map((t) => JSON.stringify(t)).join("\n") + "\n",
    "utf8",
  );
  await writeFile(
    path.join(dir, "news.jsonl"),
    input.news.map((n) => JSON.stringify(n)).join("\n") + (input.news.length ? "\n" : ""),
    "utf8",
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @crucible/scenario-builder test build-bundle`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/scenario-builder/src/build-bundle.ts packages/scenario-builder/src/build-bundle.test.ts
git commit -m "feat(scenario-builder): bundle writer + sha256 content hash"
```

---

### Task 7: CLI orchestrator + input recipe schema

**Files:**
- Create: `packages/scenario-builder/src/recipe-schema.ts`
- Create: `packages/scenario-builder/src/cli.ts`
- Create: `packages/scenario-builder/src/recipe-schema.test.ts`

**Background**: The CLI walks `packages/scenario-builder/inputs/*.yaml`, validates each via zod, then dispatches to the historical (Binance) or synthetic builder, writes the bundle, and prints a summary.

- [ ] **Step 1: Write the failing test for the schema**

```ts
// recipe-schema.test.ts
import { describe, it, expect } from "vitest";
import { RecipeSchema } from "./recipe-schema";

describe("RecipeSchema", () => {
  it("accepts a valid historical recipe", () => {
    const result = RecipeSchema.safeParse({
      id: "x", title: "X", kind: "historical", difficulty: 3, tags: ["a"],
      description: "d", tests: "t",
      fetch: {
        provider: "binance", symbol: "ETHUSDT", interval: "1m",
        start: "2024-01-01T00:00:00Z", end: "2024-01-01T01:00:00Z",
      },
      news: [],
      budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 },
      slippage: { base_bps: 1, impact_coeff: 5 },
      starting: { cash_usd: 10000, position: 0 },
      asset: "ETH-USD", tick_interval_ms: 60000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid synthetic recipe", () => {
    const result = RecipeSchema.safeParse({
      id: "x", title: "X", kind: "synthetic", difficulty: 2, tags: ["a"],
      description: "d", tests: "t",
      generator: { kind: "choppy", basePrice: 3500, bandPct: 0.003, seed: 42 },
      ticks: 200,
      news: [],
      budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 },
      slippage: { base_bps: 1, impact_coeff: 5 },
      starting: { cash_usd: 10000, position: 0 },
      asset: "ETH-USD", tick_interval_ms: 1000,
      start_ts: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects historical recipe missing fetch block", () => {
    const result = RecipeSchema.safeParse({
      id: "x", title: "X", kind: "historical", difficulty: 3, tags: [],
      description: "d", tests: "t",
      news: [],
      budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 },
      slippage: { base_bps: 1, impact_coeff: 5 },
      starting: { cash_usd: 10000, position: 0 },
      asset: "ETH-USD", tick_interval_ms: 60000,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter @crucible/scenario-builder test recipe-schema`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schema**

```ts
// recipe-schema.ts
import { z } from "zod";

const NewsInput = z.object({
  at: z.string().datetime(),
  headline: z.string(),
  source: z.string(),
  body: z.string().optional(),
});

const Common = z.object({
  id: z.string().min(1).max(31),
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  description: z.string(),
  tests: z.string(),
  news: z.array(NewsInput),
  budgets: z.object({
    llm_completions_per_tick: z.number().int().positive(),
    tool_calls_per_tick: z.number().int().positive(),
  }),
  slippage: z.object({
    base_bps: z.number().nonnegative(),
    impact_coeff: z.number().nonnegative(),
  }),
  starting: z.object({
    cash_usd: z.number().positive(),
    position: z.number(),
  }),
  asset: z.string().min(1),
  tick_interval_ms: z.number().int().positive(),
});

const Historical = Common.extend({
  kind: z.literal("historical"),
  fetch: z.object({
    provider: z.literal("binance"),
    symbol: z.string(),
    interval: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

const Synthetic = Common.extend({
  kind: z.literal("synthetic"),
  generator: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("choppy"), basePrice: z.number(), bandPct: z.number(), seed: z.number().int() }),
    z.object({ kind: z.literal("fakeout"), basePrice: z.number(), pumpPct: z.number(), reversePct: z.number(), pumpStart: z.number().int(), pumpEnd: z.number().int(), seed: z.number().int() }),
    z.object({ kind: z.literal("liquidity-crisis"), basePrice: z.number(), driftPct: z.number(), seed: z.number().int() }),
  ]),
  ticks: z.number().int().positive(),
  start_ts: z.string().datetime(),
});

export const RecipeSchema = z.discriminatedUnion("kind", [Historical, Synthetic]);
export type Recipe = z.infer<typeof RecipeSchema>;
```

- [ ] **Step 4: Run schema tests, verify pass**

Run: `pnpm --filter @crucible/scenario-builder test recipe-schema`
Expected: PASS — 3 tests.

- [ ] **Step 5: Implement CLI**

```ts
// cli.ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { RecipeSchema, type Recipe } from "./recipe-schema";
import { fetchBinanceKlines } from "./fetch-binance";
import { klinesToTicks } from "./klines-to-ticks";
import { generateChoppy, generateFakeout, generateLiquidityCrisis } from "./synthetic";
import { mapInputNews } from "./news-mapper";
import { writeBundle, computeContentHash } from "./build-bundle";
import type { Tick } from "@crucible/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const INPUTS_DIR = path.join(__dirname, "..", "inputs");
const OUT_DIR = path.join(REPO_ROOT, "scenarios");

async function buildRecipe(recipe: Recipe): Promise<void> {
  console.log(`▶ Building ${recipe.id} (${recipe.kind})...`);

  let ticks: Tick[];
  let dataSourceField: Record<string, unknown> = {};
  if (recipe.kind === "historical") {
    const rows = await fetchBinanceKlines({
      symbol: recipe.fetch.symbol,
      interval: recipe.fetch.interval,
      startMs: new Date(recipe.fetch.start).getTime(),
      endMs: new Date(recipe.fetch.end).getTime(),
    });
    const bpsSpread = recipe.slippage.base_bps;
    ticks = klinesToTicks(rows, bpsSpread);
    dataSourceField = {
      data_source: {
        provider: recipe.fetch.provider,
        symbol: recipe.fetch.symbol,
        interval: recipe.fetch.interval,
        fetched_at: new Date().toISOString(),
      },
      news_source: "hand-curated",
    };
  } else {
    const opts = { tickIntervalMs: recipe.tick_interval_ms, startTs: recipe.start_ts, ticks: recipe.ticks, seed: recipe.generator.seed, basePrice: recipe.generator.basePrice };
    if (recipe.generator.kind === "choppy") {
      ticks = generateChoppy({ ...opts, bandPct: recipe.generator.bandPct });
    } else if (recipe.generator.kind === "fakeout") {
      ticks = generateFakeout({ ...opts, pumpPct: recipe.generator.pumpPct, reversePct: recipe.generator.reversePct, pumpStart: recipe.generator.pumpStart, pumpEnd: recipe.generator.pumpEnd });
    } else {
      ticks = generateLiquidityCrisis({ ...opts, driftPct: recipe.generator.driftPct });
    }
  }

  const news = mapInputNews(recipe.news, ticks);
  const contentHash = computeContentHash(ticks, news);

  const manifest = {
    id: recipe.id,
    title: recipe.title,
    asset: recipe.asset,
    window: {
      start: ticks[0]!.ts,
      end: ticks[ticks.length - 1]!.ts,
    },
    tick_interval_ms: recipe.tick_interval_ms,
    duration_ticks: ticks.length,
    starting_cash_usd: recipe.starting.cash_usd,
    starting_position: recipe.starting.position,
    scoring: { primary: "sortino_ratio", secondary: ["max_drawdown_pct", "total_return_pct", "win_rate"] },
    slippage: recipe.slippage,
    content_hash: contentHash,
    visibility: "public",
    budgets: {
      llm_completions_per_tick: recipe.budgets.llm_completions_per_tick,
      tool_calls_per_tick: recipe.budgets.tool_calls_per_tick,
      wall_clock_ms_per_tick: 30000,
    },
    kind: recipe.kind,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    description: recipe.description,
    tests: recipe.tests,
    ...dataSourceField,
  };

  await writeBundle(path.join(OUT_DIR, recipe.id), { manifest, ticks, news });
  console.log(`  ✓ ${ticks.length} ticks, ${news.length} news → scenarios/${recipe.id}/`);
  console.log(`  content_hash: ${contentHash}`);
}

async function main() {
  const arg = process.argv[2];
  const entries = await readdir(INPUTS_DIR);
  const yamlFiles = entries.filter((f) => f.endsWith(".yaml"));
  const targets = arg ? yamlFiles.filter((f) => f.includes(arg)) : yamlFiles;
  if (targets.length === 0) {
    console.error(`No recipes matching '${arg ?? "*"}'.`);
    process.exit(1);
  }
  for (const file of targets) {
    const raw = await readFile(path.join(INPUTS_DIR, file), "utf8");
    const parsed = RecipeSchema.parse(yaml.load(raw));
    await buildRecipe(parsed);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 6: Smoke-test CLI on a tiny synthetic recipe**

Create a temp recipe and run the CLI against it. (Real recipes come in Task 10.)

```bash
mkdir -p packages/scenario-builder/inputs
cat > packages/scenario-builder/inputs/_smoke.yaml << 'EOF'
id: _smoke
title: "Smoke test"
asset: ETH-USD
kind: synthetic
difficulty: 1
tags: [test]
description: "Smoke."
tests: "Smoke."
tick_interval_ms: 1000
ticks: 10
start_ts: "2026-01-01T00:00:00Z"
generator: { kind: choppy, basePrice: 100, bandPct: 0.001, seed: 1 }
news: []
budgets: { llm_completions_per_tick: 1, tool_calls_per_tick: 1 }
slippage: { base_bps: 5, impact_coeff: 5 }
starting: { cash_usd: 10000, position: 0 }
EOF

pnpm --filter @crucible/scenario-builder build:scenarios _smoke
```

Expected output:
```
▶ Building _smoke (synthetic)...
  ✓ 10 ticks, 0 news → scenarios/_smoke/
  content_hash: 0x...
```

- [ ] **Step 7: Verify output then clean up**

```bash
ls scenarios/_smoke/
# Expected: manifest.yaml  news.jsonl  ticks.jsonl
rm -rf scenarios/_smoke packages/scenario-builder/inputs/_smoke.yaml
```

- [ ] **Step 8: Commit**

```bash
git add packages/scenario-builder/src/cli.ts packages/scenario-builder/src/recipe-schema.ts packages/scenario-builder/src/recipe-schema.test.ts
git commit -m "feat(scenario-builder): CLI orchestrator + zod recipe schema for historical/synthetic"
```

---

## Phase B — Manifest schema extension

### Task 8: Extend `Manifest` schema with optional fields

**Files:**
- Modify: `packages/core/src/manifest.ts` (the existing `ManifestSchema`)
- Modify: `packages/core/src/manifest.test.ts` (if exists; otherwise create)

- [ ] **Step 1: Read the existing manifest.ts to confirm shape**

Run: `head -60 packages/core/src/manifest.ts`

- [ ] **Step 2: Write failing test for new fields**

```ts
// packages/core/src/manifest.test.ts (create or append)
import { describe, it, expect } from "vitest";
import { ManifestSchema } from "./manifest";

describe("ManifestSchema – new optional fields", () => {
  it("accepts kind/difficulty/tags/description/tests", () => {
    const result = ManifestSchema.safeParse(baseManifest({
      kind: "historical",
      difficulty: 3,
      tags: ["news-driven"],
      description: "Some markdown.",
      tests: "Tests stuff.",
      data_source: { provider: "binance", symbol: "ETHUSDT", interval: "1m", fetched_at: "2026-05-13T00:00:00Z" },
      news_source: "hand-curated",
    }));
    expect(result.success).toBe(true);
  });

  it("still accepts manifest without the new fields (backward compatible)", () => {
    const result = ManifestSchema.safeParse(baseManifest({}));
    expect(result.success).toBe(true);
  });

  it("rejects difficulty out of 1..5", () => {
    const result = ManifestSchema.safeParse(baseManifest({ difficulty: 9 }));
    expect(result.success).toBe(false);
  });
});

function baseManifest(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "x", title: "X", asset: "ETH-USD",
    window: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T01:00:00Z" },
    tick_interval_ms: 1000, duration_ticks: 100, starting_cash_usd: 10000, starting_position: 0,
    scoring: { primary: "sortino_ratio", secondary: [] },
    slippage: { base_bps: 1, impact_coeff: 5 },
    content_hash: "0x" + "0".repeat(64),
    visibility: "public",
    budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20, wall_clock_ms_per_tick: 30000 },
    ...extra,
  };
}
```

- [ ] **Step 3: Run, verify fail**

Run: `pnpm --filter @crucible/core test`
Expected: FAIL on the "accepts kind" test — schema doesn't know those fields and zod by default *ignores* unknown keys in `z.object`, so this test may actually pass. To prevent silent ignoring of these fields, the test should also assert they survive parsing:

Add this expectation after `expect(result.success).toBe(true)`:
```ts
    if (result.success) {
      expect(result.data.kind).toBe("historical");
      expect(result.data.difficulty).toBe(3);
      expect(result.data.tags).toEqual(["news-driven"]);
    }
```

That makes the test actually fail until we add the fields.

- [ ] **Step 4: Extend the schema**

Modify `packages/core/src/manifest.ts` — add to `ManifestSchema`:

```ts
// Inside ManifestSchema z.object({ ... existing ... }):
kind: z.enum(["historical", "synthetic"]).optional(),
difficulty: z.number().int().min(1).max(5).optional(),
tags: z.array(z.string()).optional(),
description: z.string().optional(),
tests: z.string().optional(),
data_source: z.object({
  provider: z.string(),
  symbol: z.string(),
  interval: z.string(),
  fetched_at: z.string(),
}).optional(),
news_source: z.string().optional(),
```

- [ ] **Step 5: Run, verify pass**

Run: `pnpm --filter @crucible/core test`
Expected: PASS — existing tests + 3 new ones.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/manifest.ts packages/core/src/manifest.test.ts
git commit -m "feat(core): extend Manifest with optional kind/difficulty/tags/description/tests/data_source/news_source"
```

---

### Task 9: Backfill existing `synthetic-eth-flash-crash` manifest

**Files:**
- Modify: `scenarios/synthetic-eth-flash-crash/manifest.yaml`

- [ ] **Step 1: Open the existing manifest**

Run: `cat scenarios/synthetic-eth-flash-crash/manifest.yaml`

- [ ] **Step 2: Append the new fields** (preserve all existing fields)

Append to the end of `scenarios/synthetic-eth-flash-crash/manifest.yaml`:

```yaml
kind: synthetic
difficulty: 3
tags: [news-driven, flash-crash, bearish-shock]
description: |
  A synthetic 100-tick scenario simulating ETH reacting to a bearish geopolitical news
  shock. Price holds near $3,500 for the first 30 seconds, then a tariff headline lands
  and the market crashes 15% over the next minute before a partial recovery.
tests: |
  - Reading bearish news and reducing exposure
  - Avoiding the temptation to "buy the dip" too aggressively
  - Closing flat by the final tick for clean realized PnL
news_source: hand-curated
```

- [ ] **Step 3: Verify it still loads**

Run a quick CLI smoke that loads this manifest:
```bash
pnpm --filter @crucible/cli test scenario-loader || true
# OR a direct load via tsx:
pnpm exec tsx -e "import('./packages/core/src/manifest.ts').then(async m => { const p = await m.loadManifest('scenarios/synthetic-eth-flash-crash/manifest.yaml'); console.log('ok', p.kind, p.difficulty); })"
```
Expected: prints `ok synthetic 3`.

- [ ] **Step 4: Commit**

```bash
git add scenarios/synthetic-eth-flash-crash/manifest.yaml
git commit -m "chore(scenarios): backfill new manifest fields on synthetic-eth-flash-crash"
```

---

## Phase C — Author + Build the 6 Scenarios

### Task 10: Write 6 input recipes

**Files (all NEW):**
- Create: `packages/scenario-builder/inputs/eth-etf-approval.yaml`
- Create: `packages/scenario-builder/inputs/btc-flash-crash-dec-2024.yaml`
- Create: `packages/scenario-builder/inputs/luna-depeg-hour-1.yaml`
- Create: `packages/scenario-builder/inputs/choppy-range.yaml`
- Create: `packages/scenario-builder/inputs/fakeout-pump.yaml`
- Create: `packages/scenario-builder/inputs/liquidity-crisis.yaml`

- [ ] **Step 1: Write `eth-etf-approval.yaml`**

```yaml
id: eth-etf-approval
title: "ETH ETF Approval Reaction"
asset: ETH-USD
kind: historical
difficulty: 3
tags: [news-driven, bullish-shock, fade]
description: |
  On January 11, 2024 at 4:00pm ET, the SEC approved 11 spot Bitcoin ETFs.
  ETH spiked ~12% within four hours on the implied read-through, then faded
  back as first-day inflow figures underwhelmed and traders took profit.
tests: |
  - Reading bullish news and adding risk
  - Sizing into a momentum trade without becoming maximum-long at the top
  - Holding through the fade vs. taking partial profit before the inflow news
tick_interval_ms: 60000
fetch:
  provider: binance
  symbol: ETHUSDT
  interval: 1m
  start: "2024-01-11T20:30:00Z"
  end:   "2024-01-12T00:30:00Z"
news:
  - at: "2024-01-11T20:30:00Z"
    headline: "SEC approves 11 spot Bitcoin ETFs"
    source: WSJ
  - at: "2024-01-11T20:36:00Z"
    headline: "Coinbase confirms ETF custody role"
    source: Coindesk
  - at: "2024-01-11T23:30:00Z"
    headline: "ETF first-day inflows trail expectations"
    source: Bloomberg
budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 }
slippage: { base_bps: 1, impact_coeff: 5 }
starting: { cash_usd: 10000, position: 0 }
```

- [ ] **Step 2: Write `btc-flash-crash-dec-2024.yaml`**

```yaml
id: btc-flash-crash-dec-2024
title: "BTC December Flash Crash"
asset: BTC-USD
kind: historical
difficulty: 4
tags: [flash-crash, tail-risk, recovery]
description: |
  On December 9, 2024, Bitcoin dropped ~8% in roughly 30 minutes amid heavy
  liquidations around the $100k area, then snapped back as forced selling
  cleared. This scenario starts you with a small long position — do you cut,
  hold, or add?
tests: |
  - Cutting fast when the tape breaks
  - Recognising when liquidation cascades exhaust
  - Resisting the urge to round-trip the recovery
tick_interval_ms: 60000
fetch:
  provider: binance
  symbol: BTCUSDT
  interval: 1m
  start: "2024-12-09T16:00:00Z"
  end:   "2024-12-09T17:30:00Z"
news:
  - at: "2024-12-09T16:30:00Z"
    headline: "Coinbase liquidations spike, BTC down 6%"
    source: Bloomberg
  - at: "2024-12-09T17:00:00Z"
    headline: "Liquidations clear, market stabilizing"
    source: Coindesk
budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 }
slippage: { base_bps: 1, impact_coeff: 8 }
starting: { cash_usd: 10000, position: 0.05 }
```

- [ ] **Step 3: Write `luna-depeg-hour-1.yaml`**

```yaml
id: luna-depeg-hour-1
title: "LUNA Depeg Hour 1"
asset: LUNA-USD
kind: historical
difficulty: 5
tags: [tail-risk, terminal, depeg]
description: |
  May 9, 2022 — UST loses its peg, Anchor outflows accelerate, and LUNA
  begins its terminal collapse. This is the scenario that humiliates
  overconfident agents. The only profitable strategy is "sell everything
  fast." Buying the dip ends in zero.
tests: |
  - Tail-risk recognition
  - Cutting a position even at obvious losses to preserve capital
  - Resisting "buy the dip" framing when fundamentals are broken
tick_interval_ms: 60000
fetch:
  provider: binance
  symbol: LUNAUSDT
  interval: 1m
  start: "2022-05-09T16:00:00Z"
  end:   "2022-05-09T17:00:00Z"
news:
  - at: "2022-05-09T16:00:00Z"
    headline: "UST falls to $0.985, breaks peg"
    source: Coindesk
  - at: "2022-05-09T16:15:00Z"
    headline: "Anchor outflows accelerate"
    source: The Block
  - at: "2022-05-09T16:40:00Z"
    headline: "LFG sells BTC reserves to defend peg"
    source: Bloomberg
budgets: { llm_completions_per_tick: 5, tool_calls_per_tick: 20 }
slippage: { base_bps: 2, impact_coeff: 15 }
starting: { cash_usd: 10000, position: 100 }
```

- [ ] **Step 4: Write `choppy-range.yaml`**

```yaml
id: choppy-range
title: "Choppy Range"
asset: ETH-USD
kind: synthetic
difficulty: 2
tags: [range-bound, anti-overtrading]
description: |
  A synthetic 200-tick range-bound scenario: ETH trades sideways in a tight
  ±0.3% band around $3,500 for the entire run. Designed to expose agents
  that confuse noise for signal.
tests: |
  - Sitting still when there is no edge
  - Recognising that slippage + spread make small frequent trades a losing
    strategy
tick_interval_ms: 1000
ticks: 200
start_ts: "2026-01-01T00:00:00Z"
generator:
  kind: choppy
  basePrice: 3500
  bandPct: 0.003
  seed: 42
news: []
budgets: { llm_completions_per_tick: 2, tool_calls_per_tick: 5 }
slippage: { base_bps: 5, impact_coeff: 8 }
starting: { cash_usd: 10000, position: 0 }
```

- [ ] **Step 5: Write `fakeout-pump.yaml`**

```yaml
id: fakeout-pump
title: "Fakeout Pump"
asset: ETH-USD
kind: synthetic
difficulty: 3
tags: [fakeout, fomo-trap, reversal]
description: |
  A 150-tick synthetic scenario built to bait an agent. ETH drifts flat,
  then ramps +5% in 30 ticks accompanied by an on-chain "whale activity"
  headline. The headline is deliberately misleading — over the following
  80 ticks the breakout reverses to -3% from start.
tests: |
  - Skepticism toward unconfirmed bullish headlines
  - Patience to wait for follow-through before chasing a breakout
  - Cutting losses when the breakout fails instead of "hoping"
tick_interval_ms: 1000
ticks: 150
start_ts: "2026-01-01T00:00:00Z"
generator:
  kind: fakeout
  basePrice: 3500
  pumpPct: 0.05
  reversePct: -0.03
  pumpStart: 40
  pumpEnd: 70
  seed: 7
news:
  - at: "2026-01-01T00:00:35Z"
    headline: "Whale wallet activated; on-chain analysts flag accumulation"
    source: CryptoQuant
budgets: { llm_completions_per_tick: 3, tool_calls_per_tick: 8 }
slippage: { base_bps: 3, impact_coeff: 6 }
starting: { cash_usd: 10000, position: 0 }
```

- [ ] **Step 6: Write `liquidity-crisis.yaml`**

```yaml
id: liquidity-crisis
title: "Liquidity Crisis"
asset: ETH-USD
kind: synthetic
difficulty: 4
tags: [microstructure, slippage, depth-shock]
description: |
  A 200-tick synthetic scenario where price drifts -2% over the run while
  orderbook depth thins out at t=80, modeled via a higher slippage impact
  coefficient. The lesson: large market orders into a thin book pay
  ferocious prices.
tests: |
  - Position sizing relative to available depth
  - Scaling out earlier rather than dumping into a thin book
  - Waiting for depth to return before adding risk
tick_interval_ms: 1000
ticks: 200
start_ts: "2026-01-01T00:00:00Z"
generator:
  kind: liquidity-crisis
  basePrice: 3500
  driftPct: -0.02
  seed: 13
news:
  - at: "2026-01-01T00:01:20Z"
    headline: "Market makers pull bids amid systemic deleveraging fear"
    source: Bloomberg
budgets: { llm_completions_per_tick: 3, tool_calls_per_tick: 8 }
slippage: { base_bps: 5, impact_coeff: 25 }
starting: { cash_usd: 10000, position: 0 }
```

- [ ] **Step 7: Commit**

```bash
git add packages/scenario-builder/inputs
git commit -m "feat(scenarios): author 6 input recipes (3 historical + 3 synthetic)"
```

---

### Task 11: Run the builder for all 6 → commit bundles

**Files:**
- Created by build: `scenarios/eth-etf-approval/{manifest.yaml,ticks.jsonl,news.jsonl}` (and 5 more dirs)

- [ ] **Step 1: Run the builder**

```bash
pnpm --filter @crucible/scenario-builder build:scenarios
```

Expected (abridged):
```
▶ Building eth-etf-approval (historical)...
  ✓ 240 ticks, 3 news → scenarios/eth-etf-approval/
  content_hash: 0x...
▶ Building btc-flash-crash-dec-2024 (historical)...
  ...
▶ Building luna-depeg-hour-1 (historical)...
  ...
▶ Building choppy-range (synthetic)...
  ✓ 200 ticks, 0 news → scenarios/choppy-range/
  ...
[6 scenarios total]
```

- [ ] **Step 2: Verify each bundle has 3 files**

```bash
for d in scenarios/*/; do
  echo "$d:"; ls "$d"
done
```
Expected: each directory contains `manifest.yaml`, `news.jsonl`, `ticks.jsonl`.

- [ ] **Step 3: Spot-check the LUNA bundle**

```bash
head -1 scenarios/luna-depeg-hour-1/ticks.jsonl
tail -1 scenarios/luna-depeg-hour-1/ticks.jsonl
```
Expected: first tick price is large (LUNA was ~$60-70 at start of hour, depending on Binance fill), last tick price is dramatically lower.

> **Failure mode**: If Binance returns 0 rows for LUNAUSDT in May 2022 (delisted symbols can be gappy in the public archive), the build prints `✓ 0 ticks...`. In that case:
> - Try alternate symbols (`LUNCUSDT`, the renamed LUNA Classic) or change the `fetch.symbol` field.
> - If still empty: swap to a fallback scenario — `ftx-collapse-nov-2022.yaml` using `FTTUSDT` window `2022-11-08 12:00→13:00 UTC`. Same narrative energy.
> - Document the swap inline in the recipe's `description`.

- [ ] **Step 4: Commit bundles**

```bash
git add scenarios/eth-etf-approval scenarios/btc-flash-crash-dec-2024 scenarios/luna-depeg-hour-1 scenarios/choppy-range scenarios/fakeout-pump scenarios/liquidity-crisis
git commit -m "chore(scenarios): generate 6 deterministic bundles (manifest + ticks + news)"
```

---

## Phase D — `@crucible/ui-kit` components

### Task 12: `DifficultyStars` + `CopyableCommand`

**Files:**
- Create: `packages/ui-kit/src/DifficultyStars.tsx`
- Create: `packages/ui-kit/src/CopyableCommand.tsx`
- Modify: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: Implement `DifficultyStars`**

```tsx
// packages/ui-kit/src/DifficultyStars.tsx
export interface DifficultyStarsProps {
  level: number;          // 1..5
  size?: "sm" | "md";
}

export function DifficultyStars({ level, size = "md" }: DifficultyStarsProps) {
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  const px = size === "sm" ? "text-[10px]" : "text-[12px]";
  return (
    <span className={`inline-flex items-center gap-0.5 ${px} font-mono tracking-tight`} aria-label={`Difficulty ${clamped}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < clamped ? "text-[#fbbf24]" : "text-[#3a4456]"}>★</span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Implement `CopyableCommand`**

```tsx
// packages/ui-kit/src/CopyableCommand.tsx
"use client";
import { useState } from "react";

export interface CopyableCommandProps {
  command: string;
  label?: string;
}

export function CopyableCommand({ command, label = "Copy" }: CopyableCommandProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-[#0a0e17] border border-[#1c2538] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1c2538]">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Terminal</span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] uppercase tracking-[0.12em] text-[#22d3ee] hover:text-[#67e8f9] transition-colors font-medium"
        >
          {copied ? "✓ Copied" : label}
        </button>
      </div>
      <pre className="px-3 py-3 font-mono text-[12px] text-[#e6e9f0] overflow-x-auto whitespace-pre">{command}</pre>
    </div>
  );
}
```

- [ ] **Step 3: Export from `index.ts`**

Append to `packages/ui-kit/src/index.ts`:

```ts
export * from "./DifficultyStars";
export * from "./CopyableCommand";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @crucible/ui-kit typecheck`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/DifficultyStars.tsx packages/ui-kit/src/CopyableCommand.tsx packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): DifficultyStars + CopyableCommand"
```

---

### Task 13: `Tabs` primitive

**Files:**
- Create: `packages/ui-kit/src/Tabs.tsx`
- Modify: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: Implement**

```tsx
// packages/ui-kit/src/Tabs.tsx
"use client";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-[#1c2538]">
      {items.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-[#22d3ee] text-[#e6e9f0]"
                : "border-transparent text-[#6b7691] hover:text-[#e6e9f0]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Export**

Append `export * from "./Tabs";` to `packages/ui-kit/src/index.ts`.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @crucible/ui-kit typecheck
git add packages/ui-kit/src/Tabs.tsx packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): Tabs primitive (controlled, button-driven)"
```

---

### Task 14: `ScenarioPreviewChart`

**Files:**
- Create: `packages/ui-kit/src/ScenarioPreviewChart.tsx`
- Modify: `packages/ui-kit/src/index.ts`

**Background**: Lightweight SVG area chart (no markers, no tooltips). Takes `points: number[]` (price values, already downsampled by the API) and an optional `newsIndexes: number[]` for marker dots on the detail page.

- [ ] **Step 1: Implement**

```tsx
// packages/ui-kit/src/ScenarioPreviewChart.tsx
export interface ScenarioPreviewChartProps {
  points: number[];           // price values already downsampled
  height?: number;
  className?: string;
  /** Optional dot markers (e.g. news events). Indexes into `points`. */
  newsIndexes?: number[];
  /** Force direction colour; defaults to inferred from first vs last point. */
  direction?: "up" | "down";
}

export function ScenarioPreviewChart({
  points, height = 96, className = "", newsIndexes = [], direction,
}: ScenarioPreviewChartProps) {
  if (points.length < 2) {
    return <div className={`w-full ${className}`} style={{ height }} />;
  }
  const width = 600; // viewBox width — scales with preserveAspectRatio
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const norm = points.map((v, i) => [i * stepX, height - ((v - min) / range) * height] as const);
  const linePath = norm.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${(norm[norm.length - 1]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;

  const dir = direction ?? ((points[points.length - 1]! >= points[0]!) ? "up" : "down");
  const stroke = dir === "up" ? "#10b981" : "#ef4444";
  const fill = dir === "up" ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)";

  return (
    <svg
      className={`block w-full ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} />
      {newsIndexes.map((i, k) => {
        const pt = norm[i];
        if (!pt) return null;
        return (
          <circle key={k} cx={pt[0]} cy={pt[1]} r={3.5} fill="#fbbf24" stroke="#0a0e17" strokeWidth={1} />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Export + commit**

Append `export * from "./ScenarioPreviewChart";` to `packages/ui-kit/src/index.ts`.

```bash
pnpm --filter @crucible/ui-kit typecheck
git add packages/ui-kit/src/ScenarioPreviewChart.tsx packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): ScenarioPreviewChart — non-interactive SVG area chart with optional news markers"
```

---

### Task 15: `ScenarioCard`

**Files:**
- Create: `packages/ui-kit/src/ScenarioCard.tsx`
- Modify: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: Implement**

```tsx
// packages/ui-kit/src/ScenarioCard.tsx
import Link from "next/link";
import { ScenarioPreviewChart } from "./ScenarioPreviewChart";

export interface ScenarioCardData {
  id: string;
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  durationTicks: number;
  tickIntervalMs: number;
  previewPoints: number[];
  netMovePct?: number;          // last vs first as fraction
  bestSortino?: number | null;
  trials?: number;
  recordedDateLabel?: string;   // e.g. "Jan 11, 2024" for historical; "Synthetic" otherwise
}

export interface ScenarioCardProps {
  data: ScenarioCardData;
}

function tickIntervalLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms/tick`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s/tick`;
  return `${Math.round(ms / 60_000)}m/tick`;
}

function fmtPct(p: number | undefined): string {
  if (p === undefined) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(1)}%`;
}

export function ScenarioCard({ data }: ScenarioCardProps) {
  const kindLabel = data.kind === "historical" ? "Historical" : "Synthetic";
  const kindColor = data.kind === "historical" ? "text-[#22d3ee] border-[#22d3ee44] bg-[#22d3ee0a]" : "text-[#fbbf24] border-[#fbbf2444] bg-[#fbbf240a]";
  const netDirection: "up" | "down" | undefined = data.netMovePct === undefined ? undefined : data.netMovePct >= 0 ? "up" : "down";
  const moveColor = data.netMovePct === undefined ? "#aab2c5" : data.netMovePct >= 0 ? "#10b981" : "#ef4444";
  return (
    <Link
      href={`/scenarios/${data.id}`}
      className="group block bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated hover:border-[#22d3ee44] transition-colors"
    >
      <div className="relative bg-[#0a0e17]">
        <ScenarioPreviewChart points={data.previewPoints} height={120} direction={netDirection} />
        <span className="absolute top-2 right-3 text-[10px] font-mono text-[#aab2c5] bg-[#0a0e17cc] backdrop-blur px-1.5 py-0.5 rounded">
          {data.asset}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[14px] font-medium text-[#e6e9f0] leading-snug">{data.title}</span>
          <span className={`shrink-0 text-[10px] uppercase tracking-[0.1em] font-medium px-1.5 py-0.5 border rounded ${kindColor}`}>
            {kindLabel}
          </span>
        </div>
        <div className="text-[11px] text-[#6b7691]">
          {data.recordedDateLabel ? <>{data.recordedDateLabel} · </> : null}
          <span className="font-mono text-[#aab2c5]">{data.durationTicks}</span> ticks · {tickIntervalLabel(data.tickIntervalMs)}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Best Sortino" value={data.bestSortino !== null && data.bestSortino !== undefined ? data.bestSortino.toFixed(2) : "—"} />
          <Stat label="Trials" value={data.trials !== undefined ? data.trials.toString() : "—"} />
          <Stat label="Net move" value={fmtPct(data.netMovePct)} color={moveColor} />
        </div>
        <div className="text-[11px] text-[#22d3ee] group-hover:text-[#67e8f9] transition-colors pt-1">
          View scenario →
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</div>
      <div className="font-mono text-[12px] tabular-nums" style={{ color: color ?? "#e6e9f0" }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Export + commit**

Append `export * from "./ScenarioCard";` to `packages/ui-kit/src/index.ts`.

```bash
pnpm --filter @crucible/ui-kit typecheck
git add packages/ui-kit/src/ScenarioCard.tsx packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): ScenarioCard — chart-as-hero card linking to detail page"
```

---

### Task 16: `ScenarioHero`

**Files:**
- Create: `packages/ui-kit/src/ScenarioHero.tsx`
- Modify: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: Implement**

```tsx
// packages/ui-kit/src/ScenarioHero.tsx
import { DifficultyStars } from "./DifficultyStars";

export interface ScenarioHeroProps {
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  difficulty?: number;
  durationTicks: number;
  tickIntervalMs: number;
  recordedDateLabel?: string;
  tags?: string[];
}

function tickIntervalLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms / tick`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s / tick`;
  return `${Math.round(ms / 60_000)}m / tick`;
}

export function ScenarioHero(props: ScenarioHeroProps) {
  const kindLabel = props.kind === "historical" ? "Historical" : "Synthetic";
  const kindColor = props.kind === "historical"
    ? "text-[#22d3ee] border-[#22d3ee44] bg-[#22d3ee0a]"
    : "text-[#fbbf24] border-[#fbbf2444] bg-[#fbbf240a]";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">{props.title}</h1>
        <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-1 border rounded ${kindColor}`}>{kindLabel}</span>
        <span className="text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-1 border border-[#1c2538] bg-[#131b2c] rounded text-[#aab2c5]">{props.asset}</span>
        {props.difficulty !== undefined && <DifficultyStars level={props.difficulty} />}
      </div>
      <div className="text-[13px] text-[#aab2c5] flex items-center gap-2 flex-wrap">
        {props.recordedDateLabel ? (
          <>
            <span>{props.recordedDateLabel}</span>
            <span className="text-[#3a4456]">·</span>
          </>
        ) : null}
        <span><span className="font-mono text-[#e6e9f0]">{props.durationTicks}</span> ticks</span>
        <span className="text-[#3a4456]">·</span>
        <span className="font-mono">{tickIntervalLabel(props.tickIntervalMs)}</span>
        {props.tags && props.tags.length > 0 && (
          <>
            <span className="text-[#3a4456]">·</span>
            <div className="flex gap-1.5 flex-wrap">
              {props.tags.map((tag) => (
                <span key={tag} className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 bg-[#131b2c] border border-[#1c2538] rounded text-[#6b7691]">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export + commit**

```bash
pnpm --filter @crucible/ui-kit typecheck
git add packages/ui-kit/src/ScenarioHero.tsx packages/ui-kit/src/index.ts
echo 'export * from "./ScenarioHero";' >> packages/ui-kit/src/index.ts
git add packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): ScenarioHero — title + kind/asset/difficulty + meta + tag chips"
```

---

## Phase E — Web API

### Task 17: Scenario listing + detail API endpoints

**Files:**
- Create: `apps/web/lib/scenarios.ts` (server-side reader)
- Create: `apps/web/app/api/scenarios/route.ts` (list)
- Create: `apps/web/app/api/scenarios/[id]/route.ts` (single)

**Background**: We read scenario bundles directly from disk on the public web app (same pattern as `apps/local` — bundles are committed). The API enriches the manifest with a downsampled `previewPoints` array (~60 points) so cards render fast.

- [ ] **Step 1: Implement the reader**

```ts
// apps/web/lib/scenarios.ts
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { loadManifest, type Manifest } from "@crucible/core";

const WORKSPACE_ROOT = process.env["INIT_CWD"] ?? path.resolve(process.cwd(), "..", "..");
const SCENARIOS_DIR = path.join(WORKSPACE_ROOT, "scenarios");

export interface ScenarioListEntry {
  id: string;
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  difficulty?: number;
  tags?: string[];
  durationTicks: number;
  tickIntervalMs: number;
  windowStart: string;
  windowEnd: string;
  previewPoints: number[];        // ~60 downsampled mid-prices
  netMovePct: number;
}

export interface ScenarioDetail extends ScenarioListEntry {
  description?: string;
  tests?: string;
  startingCashUsd: number;
  startingPosition: number;
  contentHash: string;
  dataSource?: { provider: string; symbol: string; interval: string; fetched_at: string };
  newsSource?: string;
  newsIndexes: number[];         // indexes into previewPoints where news landed
}

function downsample(values: number[], targetLen: number): number[] {
  if (values.length <= targetLen) return values.slice();
  const step = values.length / targetLen;
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    out.push(values[Math.floor(i * step)]!);
  }
  return out;
}

async function readTicksMids(dir: string): Promise<number[]> {
  const raw = await readFile(path.join(dir, "ticks.jsonl"), "utf8");
  return raw.split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { mid: number }).mid);
}

async function readNewsTimestamps(dir: string): Promise<string[]> {
  try {
    const raw = await readFile(path.join(dir, "news.jsonl"), "utf8");
    return raw.split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { ts: string }).ts);
  } catch {
    return [];
  }
}

export async function listScenarios(): Promise<ScenarioListEntry[]> {
  const entries = await readdir(SCENARIOS_DIR);
  const out: ScenarioListEntry[] = [];
  for (const id of entries) {
    const dir = path.join(SCENARIOS_DIR, id);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
      const manifest: Manifest = await loadManifest(path.join(dir, "manifest.yaml"));
      const mids = await readTicksMids(dir);
      const preview = downsample(mids, 60);
      const netMovePct = mids.length > 1 ? (mids[mids.length - 1]! - mids[0]!) / mids[0]! : 0;
      out.push({
        id: manifest.id,
        title: manifest.title,
        asset: manifest.asset,
        kind: (manifest.kind ?? "synthetic") as "historical" | "synthetic",
        difficulty: manifest.difficulty,
        tags: manifest.tags,
        durationTicks: manifest.duration_ticks,
        tickIntervalMs: manifest.tick_interval_ms,
        windowStart: manifest.window.start,
        windowEnd: manifest.window.end,
        previewPoints: preview,
        netMovePct,
      });
    } catch {
      // skip directories that don't look like scenarios
    }
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export async function getScenarioDetail(id: string): Promise<ScenarioDetail | null> {
  const dir = path.join(SCENARIOS_DIR, id);
  try {
    const manifest: Manifest = await loadManifest(path.join(dir, "manifest.yaml"));
    const mids = await readTicksMids(dir);
    const preview = downsample(mids, 60);
    const netMovePct = mids.length > 1 ? (mids[mids.length - 1]! - mids[0]!) / mids[0]! : 0;
    const newsTs = await readNewsTimestamps(dir);

    // Map each news timestamp to its preview index (0..59) by ratio of position in ticks.
    const tickTimes = (await readFile(path.join(dir, "ticks.jsonl"), "utf8"))
      .split("\n").filter(Boolean)
      .map((l) => new Date((JSON.parse(l) as { ts: string }).ts).getTime());
    const firstT = tickTimes[0] ?? 0;
    const lastT = tickTimes[tickTimes.length - 1] ?? firstT;
    const span = Math.max(1, lastT - firstT);
    const newsIndexes = newsTs.map((ts) => {
      const ratio = (new Date(ts).getTime() - firstT) / span;
      return Math.max(0, Math.min(preview.length - 1, Math.round(ratio * (preview.length - 1))));
    });

    return {
      id: manifest.id,
      title: manifest.title,
      asset: manifest.asset,
      kind: (manifest.kind ?? "synthetic") as "historical" | "synthetic",
      difficulty: manifest.difficulty,
      tags: manifest.tags,
      durationTicks: manifest.duration_ticks,
      tickIntervalMs: manifest.tick_interval_ms,
      windowStart: manifest.window.start,
      windowEnd: manifest.window.end,
      previewPoints: preview,
      netMovePct,
      description: manifest.description,
      tests: manifest.tests,
      startingCashUsd: manifest.starting_cash_usd,
      startingPosition: manifest.starting_position,
      contentHash: manifest.content_hash,
      dataSource: manifest.data_source,
      newsSource: manifest.news_source,
      newsIndexes,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Implement the list route**

```ts
// apps/web/app/api/scenarios/route.ts
import { NextResponse } from "next/server";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export async function GET() {
  const scenarios = await listScenarios();
  return NextResponse.json({ scenarios });
}
```

- [ ] **Step 3: Implement the detail route**

```ts
// apps/web/app/api/scenarios/[id]/route.ts
import { NextResponse } from "next/server";
import { getScenarioDetail } from "@/lib/scenarios";

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getScenarioDetail(params.id);
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(detail);
}
```

- [ ] **Step 4: Smoke-test the endpoints**

Start the dev server (background) then hit:

```bash
curl -s http://localhost:3001/api/scenarios | head -c 500
curl -s http://localhost:3001/api/scenarios/eth-etf-approval | head -c 500
```

Expected: JSON arrays / objects with the new fields populated.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/scenarios.ts apps/web/app/api/scenarios
git commit -m "feat(web): /api/scenarios and /api/scenarios/[id] reading from disk bundles"
```

---

## Phase F — Web pages

### Task 18: Move existing leaderboard to `/leaderboard`

**Files:**
- Create: `apps/web/app/leaderboard/page.tsx` (move logic from current root)
- Modify: `apps/web/app/page.tsx` (will be rewritten in Task 22; for now leave temp content)

**Background**: We do this *before* writing the new landing so the global leaderboard remains reachable via a stable URL throughout the rest of the work. This task only moves the code; the root `page.tsx` continues to exist as a temporary placeholder until Task 22.

- [ ] **Step 1: Read the current `apps/web/app/page.tsx`**

Run: `cat apps/web/app/page.tsx`
Take note of the imports and the JSX — this is the leaderboard you'll move.

- [ ] **Step 2: Create `apps/web/app/leaderboard/page.tsx`**

Copy the contents of `apps/web/app/page.tsx` verbatim into the new file. No code changes.

```bash
mkdir -p apps/web/app/leaderboard
cp apps/web/app/page.tsx apps/web/app/leaderboard/page.tsx
```

- [ ] **Step 3: Replace root `page.tsx` with a temporary landing placeholder**

```tsx
// apps/web/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-semibold text-[#e6e9f0]">Crucible Bench</h1>
      <p className="text-[#aab2c5]">Landing under construction. Navigate to:</p>
      <ul className="space-y-1 text-[#22d3ee] text-[13px]">
        <li><Link className="hover:underline" href="/scenarios">Scenarios →</Link></li>
        <li><Link className="hover:underline" href="/leaderboard">Leaderboard →</Link></li>
        <li><Link className="hover:underline" href="/community">Community →</Link></li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Verify both URLs resolve**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
# Expected: 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/leaderboard
# Expected: 200
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/leaderboard/page.tsx
git commit -m "refactor(web): move global leaderboard to /leaderboard; temp placeholder at /"
```

---

### Task 19: `/scenarios` catalog page

**Files:**
- Create: `apps/web/app/scenarios/page.tsx`
- Create: `apps/web/components/ScenarioFilters.tsx`

- [ ] **Step 1: Implement `ScenarioFilters`**

```tsx
// apps/web/components/ScenarioFilters.tsx
"use client";

export type FilterValue = "all" | "historical" | "synthetic" | "ETH" | "BTC" | "LUNA";

export interface ScenarioFiltersProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

const OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "historical", label: "Historical" },
  { value: "synthetic", label: "Synthetic" },
  { value: "ETH", label: "ETH" },
  { value: "BTC", label: "BTC" },
  { value: "LUNA", label: "LUNA" },
];

export function ScenarioFilters({ value, onChange }: ScenarioFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-[#22d3ee15] text-[#22d3ee] border-[#22d3ee]"
                : "bg-[#0f1623] text-[#aab2c5] border-[#1c2538] hover:border-[#3d4a6e] hover:text-[#e6e9f0]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implement the catalog page (server component + client filter island)**

The page is a Server Component that reads scenarios directly and passes them to a client filter island.

```tsx
// apps/web/app/scenarios/page.tsx
import { listScenarios } from "@/lib/scenarios";
import { ScenarioCatalogClient } from "./ScenarioCatalogClient";

export const revalidate = 300;

export default async function ScenariosPage() {
  const scenarios = await listScenarios();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-1.5">Catalog</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Scenarios</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-2xl leading-relaxed">
          Pick a trading scenario to read about and challenge your agent on. Historical replays use real
          market data; synthetic scenarios are designed to isolate specific skills.
        </p>
      </div>
      <ScenarioCatalogClient scenarios={scenarios} />
    </div>
  );
}
```

```tsx
// apps/web/app/scenarios/ScenarioCatalogClient.tsx
"use client";
import { useMemo, useState } from "react";
import { ScenarioCard } from "@crucible/ui-kit";
import { ScenarioFilters, type FilterValue } from "@/components/ScenarioFilters";
import type { ScenarioListEntry } from "@/lib/scenarios";

function dateLabel(entry: ScenarioListEntry): string | undefined {
  if (entry.kind !== "historical") return undefined;
  const d = new Date(entry.windowStart);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ScenarioCatalogClient({ scenarios }: { scenarios: ScenarioListEntry[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return scenarios;
    if (filter === "historical" || filter === "synthetic") {
      return scenarios.filter((s) => s.kind === filter);
    }
    return scenarios.filter((s) => s.asset.toUpperCase().startsWith(filter));
  }, [scenarios, filter]);

  return (
    <div className="space-y-5">
      <ScenarioFilters value={filter} onChange={setFilter} />
      {filtered.length === 0 ? (
        <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center text-[#6b7691] text-[13px]">
          No scenarios match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <ScenarioCard
              key={s.id}
              data={{
                id: s.id,
                title: s.title,
                asset: s.asset,
                kind: s.kind,
                durationTicks: s.durationTicks,
                tickIntervalMs: s.tickIntervalMs,
                previewPoints: s.previewPoints,
                netMovePct: s.netMovePct,
                bestSortino: null,
                trials: 0,
                recordedDateLabel: dateLabel(s),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Smoke-test in browser**

Open `http://localhost:3001/scenarios` — verify 6 cards render with mini charts, filter chips work.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/scenarios apps/web/components/ScenarioFilters.tsx
git commit -m "feat(web): /scenarios catalog with chart-as-hero cards + filter chips"
```

---

### Task 20: `/scenarios/[id]` page — Overview tab

**Files:**
- Create: `apps/web/app/scenarios/[id]/page.tsx`
- Create: `apps/web/app/scenarios/[id]/ScenarioDetailClient.tsx`
- Create: `apps/web/app/scenarios/[id]/OverviewTab.tsx`

**Background**: The page reads the scenario detail server-side, then a client island handles tab switching via `?tab=` query param.

- [ ] **Step 1: Implement the server page**

```tsx
// apps/web/app/scenarios/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScenarioHero } from "@crucible/ui-kit";
import { getScenarioDetail } from "@/lib/scenarios";
import { ScenarioDetailClient } from "./ScenarioDetailClient";

export const revalidate = 300;

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ScenarioDetailPage({ params }: { params: { id: string } }) {
  const scenario = await getScenarioDetail(params.id);
  if (!scenario) notFound();

  return (
    <div className="space-y-6">
      <Link href="/scenarios" className="text-[12px] text-[#6b7691] hover:text-[#22d3ee] inline-flex items-center gap-1.5">
        <span aria-hidden>←</span> Back to scenarios
      </Link>

      <ScenarioHero
        title={scenario.title}
        asset={scenario.asset}
        kind={scenario.kind}
        difficulty={scenario.difficulty}
        durationTicks={scenario.durationTicks}
        tickIntervalMs={scenario.tickIntervalMs}
        recordedDateLabel={scenario.kind === "historical" ? dateLabel(scenario.windowStart) : "Synthetic"}
        tags={scenario.tags}
      />

      <ScenarioDetailClient scenario={scenario} />
    </div>
  );
}
```

- [ ] **Step 2: Implement the tab switcher**

```tsx
// apps/web/app/scenarios/[id]/ScenarioDetailClient.tsx
"use client";
import { useState } from "react";
import { Tabs } from "@crucible/ui-kit";
import type { ScenarioDetail } from "@/lib/scenarios";
import { OverviewTab } from "./OverviewTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "methodology", label: "Methodology" },
];

export function ScenarioDetailClient({ scenario }: { scenario: ScenarioDetail }) {
  const [active, setActive] = useState<string>(() => {
    if (typeof window === "undefined") return "overview";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab && TABS.some((t) => t.id === tab) ? tab : "overview";
  });

  function onChange(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url);
  }

  return (
    <div className="space-y-5">
      <Tabs items={TABS} activeId={active} onChange={onChange} />
      {active === "overview" && <OverviewTab scenario={scenario} />}
      {active === "leaderboard" && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-8 text-center text-[#6b7691] text-[13px]">
          Leaderboard for this scenario coming in Task 21.
        </div>
      )}
      {active === "methodology" && (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-8 text-center text-[#6b7691] text-[13px]">
          Methodology details coming in Task 21.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement Overview tab**

```tsx
// apps/web/app/scenarios/[id]/OverviewTab.tsx
import { ScenarioPreviewChart, CopyableCommand, DifficultyStars } from "@crucible/ui-kit";
import type { ScenarioDetail } from "@/lib/scenarios";

function inlineMarkdown(text: string | undefined): string[] {
  if (!text) return [];
  // Simple split: each line becomes a paragraph; bullet lines (leading "- ") stay grouped.
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function OverviewTab({ scenario }: { scenario: ScenarioDetail }) {
  const paragraphs = inlineMarkdown(scenario.description);
  const testLines = inlineMarkdown(scenario.tests);
  const command = [
    "git clone https://github.com/<owner>/crucible-bench && cd crucible-bench",
    "pnpm install",
    `pnpm --filter @crucible/cli run dev -- run scenarios/${scenario.id} \\`,
    `    --recipe apps/cli/test/fixtures/haiku-cheap-recipe.yaml \\`,
    `    --publish-network galileo`,
  ].join("\n");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Big preview chart */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
          <div className="px-5 py-3 border-b border-[#1c2538] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#e6e9f0]">Scenario preview</span>
            <span className="text-[11px] text-[#aab2c5]">
              <span className="font-mono text-[#e6e9f0]">{scenario.durationTicks}</span> ticks
            </span>
          </div>
          <div className="p-5">
            <ScenarioPreviewChart
              points={scenario.previewPoints}
              height={300}
              newsIndexes={scenario.newsIndexes}
            />
          </div>
        </div>

        {/* What happened */}
        {paragraphs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What happened</h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[14px] leading-[1.7] text-[#aab2c5]">{p}</p>
            ))}
          </section>
        )}

        {/* What this tests */}
        {testLines.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What this tests</h2>
            <ul className="space-y-2">
              {testLines.map((p, i) => (
                <li key={i} className="text-[14px] leading-[1.65] text-[#aab2c5] pl-4 relative">
                  <span className="absolute left-0 top-[10px] w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                  {p.replace(/^[-•]\s*/, "")}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Run locally */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Run it locally</h2>
          <CopyableCommand command={command} />
        </section>
      </div>

      {/* Right rail: at-a-glance */}
      <aside className="space-y-4">
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated">
          <div className="px-4 py-3 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
            At a glance
          </div>
          <dl className="divide-y divide-[#1c2538]">
            <Row label="Asset" value={scenario.asset} />
            <Row label="Ticks" value={scenario.durationTicks.toString()} mono />
            <Row label="Tick interval" value={`${scenario.tickIntervalMs} ms`} mono />
            <Row label="Starting cash" value={`$${scenario.startingCashUsd.toLocaleString()}`} mono />
            <Row label="Starting position" value={scenario.startingPosition.toString()} mono />
            {scenario.difficulty !== undefined && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Difficulty</span>
                <DifficultyStars level={scenario.difficulty} />
              </div>
            )}
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</span>
      <span className={`text-[13px] text-[#e6e9f0] ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 4: Smoke-test in browser**

Open `http://localhost:3001/scenarios/eth-etf-approval` — verify the page renders with hero, preview chart, description, tests, CLI snippet, and at-a-glance panel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/scenarios/[id]
git commit -m "feat(web): /scenarios/[id] with Overview tab — preview chart, description, tests, CLI snippet"
```

---

### Task 21: Leaderboard tab + Methodology tab in scenario detail

**Files:**
- Create: `apps/web/app/scenarios/[id]/LeaderboardTab.tsx`
- Create: `apps/web/app/scenarios/[id]/MethodologyTab.tsx`
- Modify: `apps/web/app/scenarios/[id]/ScenarioDetailClient.tsx`

**Background**: `LeaderboardTab` reuses the existing `PerScenarioTable` from `components/LeaderboardTable.tsx`, filtered by scenario id. `MethodologyTab` is static info from the manifest.

- [ ] **Step 1: Implement `LeaderboardTab` (server component receiving fetched runs)**

For a client component (the tab is rendered inside the client switcher), fetch runs via the same chain helpers used elsewhere. Use a lightweight fetch hook.

```tsx
// apps/web/app/scenarios/[id]/LeaderboardTab.tsx
"use client";
import { useEffect, useState } from "react";
import { PerScenarioTable } from "@/components/LeaderboardTable";
import type { LeaderboardRow } from "@/lib/leaderboard";

export function LeaderboardTab({ scenarioId }: { scenarioId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/leaderboard?scenarioId=${encodeURIComponent(scenarioId)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { rows: LeaderboardRow[] };
        setRows(data.rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [scenarioId]);

  if (error) {
    return (
      <div className="bg-[#0f1623] border border-[#ef444466] rounded-2xl p-4 text-[#ef4444] text-[13px]">
        Failed to load leaderboard: {error}
      </div>
    );
  }
  if (rows === null) {
    return <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">Loading on-chain runs…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-12 text-center text-[13px] text-[#6b7691]">
        No runs published for this scenario yet. Be the first — copy the CLI snippet on the Overview tab.
      </div>
    );
  }
  return <PerScenarioTable rows={rows} />;
}
```

- [ ] **Step 2: Create the API route that filters runs by scenarioId**

```ts
// apps/web/app/api/leaderboard/route.ts (NEW)
import { NextResponse } from "next/server";
import { fetchAllRuns, filterByScenario } from "@/lib/leaderboard";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scenarioId = url.searchParams.get("scenarioId");
  const runs = await fetchAllRuns();
  const rows = scenarioId ? filterByScenario(runs, scenarioId) : runs;
  return NextResponse.json({ rows });
}
```

- [ ] **Step 3: Implement `MethodologyTab`**

```tsx
// apps/web/app/scenarios/[id]/MethodologyTab.tsx
import type { ScenarioDetail } from "@/lib/scenarios";

function shortHash(h: string, head = 8, tail = 6): string {
  if (!h?.startsWith("0x")) return h;
  return `${h.slice(0, head + 2)}…${h.slice(-tail)}`;
}

export function MethodologyTab({ scenario }: { scenario: ScenarioDetail }) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1c2538]">
        <span className="text-[12px] font-medium text-[#e6e9f0]">Methodology</span>
      </div>
      <dl className="divide-y divide-[#1c2538]">
        <Row label="Bundle content hash" value={shortHash(scenario.contentHash, 10, 8)} mono />
        <Row label="Visibility" value="Public" />
        {scenario.dataSource && (
          <>
            <Row label="Price data provider" value={scenario.dataSource.provider} />
            <Row label="Symbol" value={scenario.dataSource.symbol} mono />
            <Row label="Granularity" value={scenario.dataSource.interval} mono />
            <Row label="Fetched at" value={new Date(scenario.dataSource.fetched_at).toLocaleString()} />
          </>
        )}
        {scenario.newsSource && <Row label="News source" value={scenario.newsSource} />}
        <Row label="Repo path" value={`scenarios/${scenario.id}/`} mono />
      </dl>
      <div className="px-5 py-4 border-t border-[#1c2538] text-[12px] text-[#6b7691] leading-relaxed">
        Bundles are deterministic. Re-run <code className="font-mono text-[#22d3ee]">pnpm run build:scenarios</code> from a
        clean clone to verify the content hash matches what is registered on-chain in <code className="font-mono text-[#22d3ee]">ScenarioRegistry</code>.
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</span>
      <span className={`text-[12px] text-[#e6e9f0] ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 4: Wire both into the client switcher**

Modify `apps/web/app/scenarios/[id]/ScenarioDetailClient.tsx` — replace the two placeholder blocks:

```tsx
import { LeaderboardTab } from "./LeaderboardTab";
import { MethodologyTab } from "./MethodologyTab";
// ...
{active === "leaderboard" && <LeaderboardTab scenarioId={scenario.id} />}
{active === "methodology" && <MethodologyTab scenario={scenario} />}
```

- [ ] **Step 5: Smoke-test**

Open `http://localhost:3001/scenarios/synthetic-eth-flash-crash?tab=leaderboard` — verify the existing per-scenario runs appear (this scenario has 2 published runs).

Open `http://localhost:3001/scenarios/eth-etf-approval?tab=methodology` — verify the methodology card shows the Binance data source.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/scenarios/[id]/LeaderboardTab.tsx apps/web/app/scenarios/[id]/MethodologyTab.tsx apps/web/app/scenarios/[id]/ScenarioDetailClient.tsx apps/web/app/api/leaderboard/route.ts
git commit -m "feat(web): scenario-detail Leaderboard + Methodology tabs (+ /api/leaderboard filter)"
```

---

### Task 22: New `/` landing page

**Files:**
- Modify: `apps/web/app/page.tsx` (replace placeholder)
- Create: `apps/web/components/LandingHero.tsx`
- Create: `apps/web/components/FeaturedScenarios.tsx`
- Create: `apps/web/components/RecentRunsFeed.tsx`

- [ ] **Step 1: Implement `LandingHero`**

```tsx
// apps/web/components/LandingHero.tsx
import Link from "next/link";

export function LandingHero({ scenarioCount }: { scenarioCount: number }) {
  return (
    <section className="bg-[#0f1623] border border-[#1c2538] rounded-3xl overflow-hidden card-elevated">
      <div className="px-8 py-14 md:py-20">
        <div className="text-[12px] uppercase tracking-[0.16em] text-[#22d3ee] font-medium mb-4">
          Verifiable benchmarks on 0G
        </div>
        <h1 className="text-[40px] md:text-[56px] font-semibold tracking-tight text-[#e6e9f0] leading-[1.05] max-w-3xl">
          Battle-test your OpenClaw agent against real market crises.
        </h1>
        <p className="mt-5 text-[15px] md:text-[16px] text-[#aab2c5] max-w-2xl leading-relaxed">
          Replay LUNA&rsquo;s collapse, the BTC flash crash, the ETH ETF reaction. Every run is signed,
          attested, and recorded on 0G Storage. The leaderboard is fully on-chain.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Browse {scenarioCount} scenarios <span aria-hidden>→</span>
          </Link>
          <Link
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#131b2c] border border-[#1c2538] text-[#aab2c5] hover:border-[#3d4a6e] hover:text-[#e6e9f0] px-5 py-2.5 rounded-lg transition-colors"
          >
            <code className="font-mono">crucible run</code> <span aria-hidden>↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement `FeaturedScenarios` (server)**

```tsx
// apps/web/components/FeaturedScenarios.tsx
import Link from "next/link";
import { ScenarioCard } from "@crucible/ui-kit";
import { listScenarios } from "@/lib/scenarios";

const FEATURED_IDS = ["luna-depeg-hour-1", "btc-flash-crash-dec-2024", "eth-etf-approval"];

export async function FeaturedScenarios() {
  const all = await listScenarios();
  const byId = new Map(all.map((s) => [s.id, s]));
  const featured = FEATURED_IDS.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Featured scenarios</h2>
        <Link href="/scenarios" className="text-[12px] text-[#22d3ee] hover:underline">
          See all {all.length} →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {featured.map((s) => (
          <ScenarioCard
            key={s.id}
            data={{
              id: s.id, title: s.title, asset: s.asset, kind: s.kind,
              durationTicks: s.durationTicks, tickIntervalMs: s.tickIntervalMs,
              previewPoints: s.previewPoints,
              netMovePct: s.netMovePct,
              bestSortino: null, trials: 0,
              recordedDateLabel: s.kind === "historical" ? new Date(s.windowStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
            }}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Implement `RecentRunsFeed` (server)**

```tsx
// apps/web/components/RecentRunsFeed.tsx
import Link from "next/link";
import { fetchAllRuns } from "@/lib/leaderboard";
import { fmtSortino } from "@/lib/format";

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export async function RecentRunsFeed() {
  const runs = await fetchAllRuns();
  const recent = runs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Recent runs</h2>
        <Link href="/leaderboard" className="text-[12px] text-[#22d3ee] hover:underline">
          View leaderboard →
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="bg-[#0f1623] border border-dashed border-[#1c2538] rounded-2xl p-8 text-center text-[12px] text-[#6b7691]">
          No runs yet.
        </div>
      ) : (
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated divide-y divide-[#1c2538]">
          {recent.map((r) => (
            <Link key={r.runId} href={`/runs/${r.runId}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#ffffff03] transition-colors">
              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-[#22d3ee] font-medium">Agent #{r.agentId}</span>
                <span className="text-[#3a4456]">·</span>
                <span className="text-[#aab2c5]">{r.scenarioId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[12px]" style={{ color: r.sortino >= 0 ? "#10b981" : "#ef4444" }}>
                  {r.sortino >= 0 ? "▲" : "▼"} {fmtSortino(r.sortino)}
                </span>
                <span className="text-[11px] text-[#6b7691]">{timeAgo(r.timestamp)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Replace `apps/web/app/page.tsx`**

```tsx
// apps/web/app/page.tsx
import { LandingHero } from "@/components/LandingHero";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { RecentRunsFeed } from "@/components/RecentRunsFeed";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();
  return (
    <div className="space-y-10">
      <LandingHero scenarioCount={all.length} />
      <FeaturedScenarios />
      <RecentRunsFeed />
    </div>
  );
}
```

- [ ] **Step 5: Smoke-test**

Open `http://localhost:3001/` — verify hero + 3 featured cards + recent runs feed render.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/LandingHero.tsx apps/web/components/FeaturedScenarios.tsx apps/web/components/RecentRunsFeed.tsx
git commit -m "feat(web): landing page — hero + 3 featured scenarios + recent runs feed"
```

---

### Task 23: `/community` placeholder

**Files:**
- Create: `apps/web/app/community/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// apps/web/app/community/page.tsx
import Link from "next/link";

export const revalidate = 3600;

export default function CommunityPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-1.5">Coming soon</div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#e6e9f0]">Community scenarios</h1>
        <p className="text-[14px] text-[#aab2c5] mt-3 leading-relaxed">
          The launch catalog of 6 scenarios is hand-curated. We&rsquo;re opening submissions to anyone who
          wants to author a new scenario — historical replays, designed stress tests, multi-asset
          challenges, anything that reveals an agent skill.
        </p>
      </div>

      <section className="bg-[#0f1623] border border-[#1c2538] rounded-2xl p-6 space-y-5 card-elevated">
        <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What&rsquo;s planned</h2>
        <ul className="space-y-3 text-[13px] text-[#aab2c5] leading-relaxed">
          <Bullet>
            <strong className="text-[#e6e9f0]">PR-based contributions.</strong> Drop an <code className="font-mono text-[#22d3ee]">inputs/&lt;name&gt;.yaml</code> file in the repo. CI runs the builder, produces a deterministic bundle, and computes a content hash. You sign the on-chain registration with your wallet — your address is the canonical author.
          </Bullet>
          <Bullet>
            <strong className="text-[#e6e9f0]">Curated quality bar.</strong> Initial submissions are reviewed for fairness (no insider-data scenarios, no unverifiable price tapes) and for the clarity of the description / tests. Once the review pipeline is automated, this becomes self-service.
          </Bullet>
          <Bullet>
            <strong className="text-[#e6e9f0]">Attribution everywhere.</strong> Your wallet appears as the author on every leaderboard your scenario shows up on. We&rsquo;re also exploring revenue-share once paid recipes ship.
          </Bullet>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Want to propose one now?</h2>
        <p className="text-[13px] text-[#aab2c5] leading-relaxed">
          Open a discussion in the repo with the scenario you have in mind. We&rsquo;ll fast-track the first
          batch of community scenarios for the next release.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] px-4 py-2 rounded-lg transition-colors"
          >
            Propose a scenario <span aria-hidden>↗</span>
          </Link>
          <Link
            href="mailto:hello@cruciblebench.xyz?subject=Notify%20me%20about%20community%20scenarios"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#131b2c] border border-[#1c2538] text-[#aab2c5] hover:border-[#3d4a6e] hover:text-[#e6e9f0] px-4 py-2 rounded-lg transition-colors"
          >
            Get notified
          </Link>
        </div>
      </section>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="pl-5 relative">
      <span className="absolute left-0 top-[8px] w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
      {children}
    </li>
  );
}
```

- [ ] **Step 2: Smoke-test**

Open `http://localhost:3001/community` — verify renders cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/community
git commit -m "feat(web): /community placeholder page (planned rollout + propose link)"
```

---

### Task 24: Update header nav + cross-links

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `packages/ui-kit/src/TerminalHeader.tsx` (if needed — likely just pass new nav items)

**Background**: The header currently has nav items `Leaderboard · Built on 0G`. Replace with `Scenarios · Leaderboard · Community · GitHub`.

- [ ] **Step 1: Read existing layout**

Run: `cat apps/web/app/layout.tsx`

- [ ] **Step 2: Update the nav passed to `TerminalHeader`**

Edit the nav array in `apps/web/app/layout.tsx`:

```tsx
// inside <TerminalHeader ... nav={...}>
nav={[
  { label: "Scenarios", href: "/scenarios" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Community", href: "/community" },
  { label: "GitHub", href: "https://github.com/" },
]}
```

If the layout passes `activePath`, leave it; the existing logic already underlines based on path.

- [ ] **Step 3: Smoke-test**

Open `http://localhost:3001/` and click each nav item — all four should land cleanly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat(web): update header nav — Scenarios · Leaderboard · Community · GitHub"
```

---

## Phase G — On-chain registration + smoke test + deploy

### Task 25: Register the 5 new scenarios on Galileo (USER ACTION)

**Files:**
- Create: `apps/cli/scripts/register-scenarios.ts`

**Background**: The existing `ScenarioRegistry` contract has a `registerScenario(id, contentHash, ipfsCid)` function. We need to call it once per new scenario. The user runs this with their private key.

- [ ] **Step 1: Implement the registration script**

```ts
// apps/cli/scripts/register-scenarios.ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { ethers } from "ethers";
import { loadChainConfig, type Network, getScenarioRegistry } from "@crucible/og-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCENARIOS_DIR = path.join(REPO_ROOT, "scenarios");

interface MinimalManifest {
  id: string;
  content_hash: string;
}

async function main() {
  const network = (process.env["NETWORK"] ?? "galileo") as Network;
  const pk = process.env["DEPLOYER_PRIVATE_KEY"];
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY must be set");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const registry = await getScenarioRegistry(wallet);

  const dirs = await readdir(SCENARIOS_DIR);
  for (const id of dirs) {
    const manifestPath = path.join(SCENARIOS_DIR, id, "manifest.yaml");
    let m: MinimalManifest;
    try {
      const raw = await readFile(manifestPath, "utf8");
      m = yaml.load(raw) as MinimalManifest;
    } catch {
      continue;
    }
    const idBytes32 = ethers.encodeBytes32String(m.id);
    try {
      const existing = await registry.getScenario(idBytes32);
      if (existing && existing.contentHash !== ethers.ZeroHash) {
        console.log(`= ${m.id}: already registered (hash ${existing.contentHash.slice(0, 12)}…), skipping`);
        continue;
      }
    } catch { /* not registered yet */ }

    console.log(`▶ Registering ${m.id} → ${m.content_hash}`);
    const tx = await registry.registerScenario(idBytes32, m.content_hash, "");
    const rcpt = await tx.wait();
    console.log(`  ✓ tx ${rcpt!.hash}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script to `apps/cli/package.json`**

Add under `"scripts"`:
```json
"register-scenarios": "tsx scripts/register-scenarios.ts"
```

- [ ] **Step 3: Verify the script type-checks**

Run: `pnpm --filter @crucible/cli typecheck`
Expected: success.

- [ ] **Step 4: Commit the script**

```bash
git add apps/cli/scripts/register-scenarios.ts apps/cli/package.json
git commit -m "feat(cli): register-scenarios script for ScenarioRegistry batch registration"
```

- [ ] **Step 5: User runs the script against Galileo**

The user runs (with their deployer key in env):

```bash
DEPLOYER_PRIVATE_KEY=0x... NETWORK=galileo pnpm --filter @crucible/cli register-scenarios
```

Expected: 5 transactions land (one per new scenario), each printed as `✓ tx 0x...`.

After this completes the user reports back; no further commit needed (chain state changed, repo state did not).

---

### Task 26: Full browser smoke test

**Files (no edits):** read-only verification.

- [ ] **Step 1: Start the dev server clean**

```bash
pnpm --filter @crucible/web dev
```
Wait for "Ready in ..." log.

- [ ] **Step 2: Walk the user journeys**

In the browser open each URL in turn and verify:

1. **`/`** — Hero renders with "Battle-test your OpenClaw agent…" headline. 3 featured scenario cards with mini charts. Recent runs feed lists at least 2 entries (Run #0, #1 from existing scenario; more if new runs published).
2. **`/scenarios`** — 7 scenario cards (6 new + the existing `synthetic-eth-flash-crash`). Filter chips work: clicking `Historical` shows 3 cards; `Synthetic` shows 4; `ETH` shows the ETH-asset ones.
3. **`/scenarios/eth-etf-approval`** — hero shows `Historical` chip, `ETH-USD` chip, 3-star difficulty, "Jan 11 2024" date label. Preview chart renders with 3 amber news dots. "What happened" and "What this tests" sections populate. CLI snippet has a Copy button (click verifies clipboard works → button reads `✓ Copied`).
4. **`/scenarios/eth-etf-approval?tab=leaderboard`** — empty state ("No runs published for this scenario yet").
5. **`/scenarios/synthetic-eth-flash-crash?tab=leaderboard`** — shows the existing 2 runs.
6. **`/scenarios/luna-depeg-hour-1?tab=methodology`** — methodology card shows `binance / LUNAUSDT / 1m / fetched at <date>`. Content hash visible.
7. **`/leaderboard`** — original leaderboard, same as previous root.
8. **`/community`** — coming-soon page renders.
9. **`/runs/1`** — synchronized player still works (regression check; this page was not touched).
10. **Header nav** — clicking each item lands correctly; active item is highlighted.

- [ ] **Step 3: Note any defects**

If any step fails, file a TODO comment in this plan referencing the failing step, fix it as a follow-up task before committing the smoke-test sign-off.

- [ ] **Step 4: Commit the smoke-test verification (no code change, just confirming all green)**

```bash
git commit --allow-empty -m "chore(web): full browser smoke test of scenario-oriented redesign — all green"
```

---

### Task 27: Vercel deploy + DNS (USER ACTION)

**Files:**
- Optionally create: `apps/web/vercel.json`

- [ ] **Step 1: Ensure `apps/web` builds standalone**

```bash
pnpm --filter @crucible/web build
```
Expected: clean build, no errors. Resolve any TypeScript errors before deploying.

- [ ] **Step 2 (user): Connect repo on Vercel**

In Vercel dashboard: New Project → import this repo → set Root Directory to `apps/web` → framework auto-detects Next.js 14 → set environment variables matching local `.env`:
- `NEXT_PUBLIC_OG_NETWORK=galileo`
- Any RPC URLs / contract addresses your `og-client` reads.

- [ ] **Step 3 (user): Add custom domain `cruciblebench.xyz`**

Vercel project → Settings → Domains → add `cruciblebench.xyz`. Vercel will instruct you to update the registrar's DNS records (typically: A record to Vercel IP + CNAME for www).

Update the registrar (where you bought `cruciblebench.xyz`) DNS to point at Vercel.

- [ ] **Step 4 (user): Verify the deploy**

After DNS propagates (5–30 min), `https://cruciblebench.xyz/` should render the landing page.

Walk one full user journey on the live URL: `/` → `/scenarios` → `/scenarios/eth-etf-approval` → Tab=Leaderboard → Tab=Methodology → back to `/leaderboard` → `/community`.

- [ ] **Step 5: Final commit**

```bash
git commit --allow-empty -m "chore: scenario-oriented redesign deployed to cruciblebench.xyz"
```

---

## Self-Review Notes

- **Spec coverage**: Every spec section has at least one task (IA → 18+22+23+24; Visual design → 12–16, 19–23; Manifest/Pipeline → 1–9; Authoring → 10–11; Migration → 18, 24; Implementation order matches; Risks acknowledged in task 11 fallback note).
- **Placeholder scan**: No "TBD/TODO" placeholders remain; the LUNA-symbol-availability risk has a concrete fallback inline. The GitHub repo URL in copy snippets is `https://github.com/<owner>/crucible-bench` — this should be replaced with the actual repo URL before the launch but is intentionally left generic in the plan (it's user-environment info, not code).
- **Type consistency**: `Manifest` schema is extended in T8 with exactly the fields referenced by the API reader (T17) and consumed by the cards / hero / tabs (T15, T16, T20, T21). `ScenarioListEntry` / `ScenarioDetail` shapes match what the components import in T15/T16/T20.
- **Test discipline**: Pure-logic units (T2–T7, T8 schema) have full TDD with vitest. UI components (T12–T16) and pages (T17–T23) verified via the browser smoke test in T26. Matches the existing repo convention (`packages/core` and `packages/coach` have vitest; `packages/ui-kit` has no test files).
- **Migration safety**: Existing `/runs/[id]`, `/agents/[id]`, `/api/trace/*`, `/api/recipe/*`, `/api/scenario/[id]/ticks` routes are untouched. Existing scenario keeps loading (T8 backward-compat + T9 backfill).
