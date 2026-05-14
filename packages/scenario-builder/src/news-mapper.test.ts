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
