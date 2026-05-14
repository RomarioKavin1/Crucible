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
