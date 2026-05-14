import { describe, it, expect } from "vitest";
import type {
  Tick,
  OrderBookLevel,
  OrderBookSnapshot,
  NewsItem,
  Order,
  Fill,
  Portfolio,
  MarketSnapshot,
  TraceEntry,
} from "../src/types.js";

describe("type module", () => {
  it("exports a Tick that conforms to expected shape", () => {
    const t: Tick = {
      ts: "2025-04-02T13:00:00Z",
      mid: 3421.5,
      bid: 3421.1,
      ask: 3421.9,
      last: 3421.5,
      volume: 12.4,
    };
    expect(t.mid).toBe(3421.5);
  });

  it("exports an Order with required fields", () => {
    const o: Order = {
      id: "ord-1",
      side: "buy",
      type: "limit",
      qty: 1.0,
      price: 3400,
      ttlTicks: 100,
      createdAtTick: 0,
    };
    expect(o.side).toBe("buy");
  });
});
