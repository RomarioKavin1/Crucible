import { describe, it, expect } from "vitest";
import { generateChoppy, generateFakeout, generateLiquidityCrisis } from "./synthetic";

describe("synthetic generators", () => {
  it("choppy produces N ticks bounded around the basePrice", () => {
    const ticks = generateChoppy({
      ticks: 200, tickIntervalMs: 1000, startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500, bandPct: 0.003, seed: 42,
    });
    expect(ticks).toHaveLength(200);
    for (const t of ticks) {
      expect(t.mid).toBeGreaterThan(3500 * 0.99);
      expect(t.mid).toBeLessThan(3500 * 1.01);
    }
    const again = generateChoppy({ ticks: 200, tickIntervalMs: 1000, startTs: "2026-01-01T00:00:00Z", basePrice: 3500, bandPct: 0.003, seed: 42 });
    expect(again[100]!.mid).toBe(ticks[100]!.mid);
  });

  it("fakeout pumps to ~+5% then collapses to ~-3%", () => {
    const ticks = generateFakeout({
      ticks: 150, tickIntervalMs: 1000, startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500, pumpPct: 0.05, reversePct: -0.03, pumpStart: 40, pumpEnd: 70, seed: 7,
    });
    expect(ticks).toHaveLength(150);
    expect(ticks[70]!.mid).toBeGreaterThan(3500 * 1.04);
    expect(ticks[70]!.mid).toBeLessThan(3500 * 1.06);
    expect(ticks[149]!.mid).toBeGreaterThan(3500 * 0.96);
    expect(ticks[149]!.mid).toBeLessThan(3500 * 0.98);
  });

  it("liquidity-crisis drifts down ~2% with stable ts spacing", () => {
    const ticks = generateLiquidityCrisis({
      ticks: 200, tickIntervalMs: 1000, startTs: "2026-01-01T00:00:00Z",
      basePrice: 3500, driftPct: -0.02, seed: 13,
    });
    expect(ticks).toHaveLength(200);
    expect(ticks[199]!.mid).toBeGreaterThan(3500 * 0.97);
    expect(ticks[199]!.mid).toBeLessThan(3500 * 0.99);
  });
});
