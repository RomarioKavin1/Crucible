import { describe, it, expect } from "vitest";
import { marketFillPrice, DEFAULT_SLIPPAGE } from "./slippage.js";

describe("marketFillPrice", () => {
  it("adds slippage above mid for a buy", () => {
    const p = marketFillPrice({ mid: 1000, side: "buy", qty: 1, top10Depth: 100 });
    expect(p).toBeGreaterThan(1000);
  });

  it("subtracts slippage below mid for a sell", () => {
    const p = marketFillPrice({ mid: 1000, side: "sell", qty: 1, top10Depth: 100 });
    expect(p).toBeLessThan(1000);
  });

  it("scales impact with order size relative to depth", () => {
    const small = marketFillPrice({ mid: 1000, side: "buy", qty: 1, top10Depth: 100 });
    const large = marketFillPrice({ mid: 1000, side: "buy", qty: 10, top10Depth: 100 });
    expect(large - 1000).toBeGreaterThan(small - 1000);
  });

  it("clamps impact when the book is thin (regression)", () => {
    // Without the clamp, qty 10 vs depth 0.01 would produce ~5000 bps of impact.
    const p = marketFillPrice({ mid: 1000, side: "buy", qty: 10, top10Depth: 0.01 });
    const maxPrice = 1000 * (1 + (DEFAULT_SLIPPAGE.baseBps + DEFAULT_SLIPPAGE.maxImpactBps) / 10_000);
    expect(p).toBeLessThanOrEqual(maxPrice + 1e-9);
  });
});
