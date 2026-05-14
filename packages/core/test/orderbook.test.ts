import { describe, it, expect, beforeEach } from "vitest";
import { LocalOrderBook, computeMarketFillPrice } from "../src/orderbook.js";
import type { Order, Tick } from "../src/types.js";

describe("computeMarketFillPrice", () => {
  it("buy at ask + base slippage when order is small vs depth", () => {
    const tick: Tick = { ts: "t", mid: 100, bid: 99.9, ask: 100.1, last: 100, volume: 1 };
    const price = computeMarketFillPrice({
      side: "buy", qty: 0.1, topDepth: 100, mid: tick.mid,
      base_bps: 1, impact_coeff: 5,
    });
    // base 1 bp + impact 5 * (0.1/100) = 0.005 bps -> 1.005 bps total
    // expected: 100 * (1 + 0.0001005) = 100.01005
    expect(price).toBeCloseTo(100.01005, 4);
  });

  it("sell hits below mid", () => {
    const price = computeMarketFillPrice({
      side: "sell", qty: 0.1, topDepth: 100, mid: 100,
      base_bps: 1, impact_coeff: 5,
    });
    expect(price).toBeCloseTo(99.98995, 4);
  });

  it("large order pays significant impact", () => {
    const price = computeMarketFillPrice({
      side: "buy", qty: 50, topDepth: 100, mid: 100,
      base_bps: 1, impact_coeff: 5,
    });
    // base 1 + impact 5 * 0.5 = 2.5 -> 3.5 bps total
    // 100 * 1.00035 = 100.035
    expect(price).toBeCloseTo(100.035, 4);
  });
});

describe("LocalOrderBook (resting limit orders)", () => {
  let book: LocalOrderBook;

  beforeEach(() => {
    book = new LocalOrderBook();
  });

  it("matches a buy limit when tape trades through it", () => {
    const order: Order = {
      id: "o1", side: "buy", type: "limit", qty: 1, price: 99,
      ttlTicks: 100, createdAtTick: 0,
    };
    book.add(order);
    const tickAbove: Tick = { ts: "t1", mid: 100, bid: 99.9, ask: 100.1, last: 100, volume: 1 };
    const fillsNoMatch = book.matchAgainstTape(tickAbove, /* tickIndex */ 1);
    expect(fillsNoMatch).toHaveLength(0);

    const tickThrough: Tick = { ts: "t2", mid: 98.5, bid: 98.4, ask: 98.6, last: 98.5, volume: 1 };
    const fills = book.matchAgainstTape(tickThrough, 2);
    expect(fills).toHaveLength(1);
    expect(fills[0]?.price).toBe(99);
    expect(fills[0]?.qty).toBe(1);
  });

  it("expires limit orders past TTL", () => {
    book.add({ id: "o1", side: "buy", type: "limit", qty: 1, price: 50, ttlTicks: 2, createdAtTick: 0 });
    const tick: Tick = { ts: "t", mid: 100, bid: 99.9, ask: 100.1, last: 100, volume: 1 };
    book.matchAgainstTape(tick, 1);
    expect(book.openOrders()).toHaveLength(1);
    book.matchAgainstTape(tick, 2);
    expect(book.openOrders()).toHaveLength(1);
    book.matchAgainstTape(tick, 3);
    expect(book.openOrders()).toHaveLength(0);
  });

  it("cancels by id", () => {
    book.add({ id: "o1", side: "buy", type: "limit", qty: 1, price: 99, ttlTicks: 100, createdAtTick: 0 });
    expect(book.cancel("o1")).toBe(true);
    expect(book.openOrders()).toHaveLength(0);
    expect(book.cancel("nonexistent")).toBe(false);
  });
});
