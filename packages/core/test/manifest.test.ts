import { describe, it, expect } from "vitest";
import { loadManifest, ManifestSchema } from "../src/manifest.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    if (result.success) {
      expect(result.data.kind).toBe("historical");
      expect(result.data.difficulty).toBe(3);
      expect(result.data.tags).toEqual(["news-driven"]);
    }
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

describe("manifest loader", () => {
  it("loads and parses a valid manifest", async () => {
    const m = await loadManifest(
      path.join(__dirname, "fixtures/valid-manifest.yaml")
    );
    expect(m.id).toBe("synthetic-eth-flash-crash");
    expect(m.duration_ticks).toBe(100);
    expect(m.scoring.primary).toBe("sortino_ratio");
    expect(m.slippage.base_bps).toBe(1);
    expect(m.budgets.llm_completions_per_tick).toBe(5);
  });

  it("rejects a manifest with missing required fields", () => {
    const bad = { id: "x" };
    expect(() => ManifestSchema.parse(bad)).toThrow();
  });

  it("rejects a manifest with negative tick_interval_ms", () => {
    const bad = {
      id: "x", title: "x", asset: "X-USD",
      window: { start: "2025-01-01T00:00:00Z", end: "2025-01-01T00:01:00Z" },
      tick_interval_ms: -1, duration_ticks: 60,
      starting_cash_usd: 100, starting_position: 0,
      scoring: { primary: "sortino_ratio", secondary: [] },
      slippage: { base_bps: 1, impact_coeff: 5 },
      content_hash: "0x00", visibility: "public",
      budgets: { llm_completions_per_tick: 1, tool_calls_per_tick: 1, wall_clock_ms_per_tick: 1000 },
    };
    expect(() => ManifestSchema.parse(bad)).toThrow();
  });

  it("rejects when window.end is not after window.start", () => {
    const bad = {
      id: "x", title: "x", asset: "X-USD",
      window: { start: "2025-01-02T00:00:00Z", end: "2025-01-01T00:00:00Z" },
      tick_interval_ms: 1000, duration_ticks: 60,
      starting_cash_usd: 100, starting_position: 0,
      scoring: { primary: "sortino_ratio", secondary: [] },
      slippage: { base_bps: 1, impact_coeff: 5 },
      content_hash: "0x00", visibility: "public",
      budgets: { llm_completions_per_tick: 1, tool_calls_per_tick: 1, wall_clock_ms_per_tick: 1000 },
    };
    expect(() => ManifestSchema.parse(bad)).toThrow();
  });

  it("loadManifest wraps errors with the file path", async () => {
    await expect(loadManifest("/nonexistent/path/manifest.yaml")).rejects.toThrow();
  });

  it("rejects scenario id longer than 31 chars", () => {
    const bad = {
      id: "this-scenario-id-is-way-too-long-for-bytes32",
      title: "x", asset: "X-USD",
      window: { start: "2025-01-01T00:00:00Z", end: "2025-01-01T00:01:00Z" },
      tick_interval_ms: 1000, duration_ticks: 60,
      starting_cash_usd: 100, starting_position: 0,
      scoring: { primary: "sortino_ratio", secondary: [] },
      slippage: { base_bps: 1, impact_coeff: 5 },
      content_hash: "0x00", visibility: "public",
      budgets: { llm_completions_per_tick: 1, tool_calls_per_tick: 1, wall_clock_ms_per_tick: 1000 },
    };
    expect(() => ManifestSchema.parse(bad)).toThrow();
  });
});
