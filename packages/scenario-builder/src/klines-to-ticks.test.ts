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
    expect(ticks[0]!.mid).toBeCloseTo(3502.5, 4);
    expect(ticks[0]!.last).toBeCloseTo(3505.0, 4);
    expect(ticks[0]!.volume).toBeCloseTo(12.5, 4);
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
