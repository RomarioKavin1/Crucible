import { describe, it, expect } from "vitest";
import { sortinoRatio, maxDrawdownPct, totalReturnPct, winRate } from "../src/scoring.js";

describe("scoring", () => {
  it("sortino is 0 for an all-zero return series", () => {
    expect(sortinoRatio([0, 0, 0, 0])).toBe(0);
  });

  it("sortino is positive when avg return > 0 and downside is small", () => {
    const ratio = sortinoRatio([0.01, 0.02, -0.005, 0.015, 0.01]);
    expect(ratio).toBeGreaterThan(0);
  });

  it("sortino with zero downside variance is +Infinity (sanitized to a large number)", () => {
    expect(sortinoRatio([0.01, 0.02, 0.005])).toBeGreaterThan(100);
  });

  it("maxDrawdownPct picks the deepest peak-to-trough", () => {
    expect(maxDrawdownPct([100, 110, 105, 120, 80, 90])).toBeCloseTo(-(120 - 80) / 120, 6);
  });

  it("totalReturnPct is end/start - 1", () => {
    expect(totalReturnPct([100, 120])).toBeCloseTo(0.2, 6);
  });

  it("winRate counts positive trade returns", () => {
    expect(winRate([10, -5, 7, -2, 0])).toBeCloseTo(2 / 5, 6);
  });
});
