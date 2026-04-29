import { describe, it, expect } from "vitest";
import { marketFillPrice } from "./slippage.js";

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
});
