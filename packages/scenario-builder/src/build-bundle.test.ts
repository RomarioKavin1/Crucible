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
