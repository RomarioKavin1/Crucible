import { describe, it, expect, beforeEach } from "vitest";
import { PortfolioAccount } from "../src/portfolio.js";
import type { Fill } from "../src/types.js";

describe("PortfolioAccount", () => {
  let acct: PortfolioAccount;

  beforeEach(() => {
    acct = new PortfolioAccount({ cash: 1000, position: 0 });
  });

  it("starts with the given cash and zero position", () => {
    const s = acct.snapshot(100);
    expect(s.cash).toBe(1000);
    expect(s.position).toBe(0);
    expect(s.realizedPnl).toBe(0);
    expect(s.unrealizedPnl).toBe(0);
  });

  it("applies a buy fill: deducts cash, increases position", () => {
    const fill: Fill = { orderId: "o", side: "buy", qty: 2, price: 100, feeBps: 0, ts: "t", tick: 1 };
    acct.applyFill(fill);
    const s = acct.snapshot(100);
    expect(s.cash).toBe(800);
    expect(s.position).toBe(2);
  });

  it("computes unrealized PnL when price moves", () => {
    acct.applyFill({ orderId: "o", side: "buy", qty: 2, price: 100, feeBps: 0, ts: "t", tick: 1 });
    const s = acct.snapshot(110);
    expect(s.unrealizedPnl).toBe(20);
  });

  it("realizes PnL on closing the position", () => {
    acct.applyFill({ orderId: "o1", side: "buy", qty: 2, price: 100, feeBps: 0, ts: "t", tick: 1 });
    acct.applyFill({ orderId: "o2", side: "sell", qty: 2, price: 110, feeBps: 0, ts: "t", tick: 2 });
    const s = acct.snapshot(110);
    expect(s.position).toBe(0);
    expect(s.realizedPnl).toBe(20);
    expect(s.cash).toBe(1020);
  });

  it("tracks drawdown from high-water mark of total equity", () => {
    acct.applyFill({ orderId: "o", side: "buy", qty: 2, price: 100, feeBps: 0, ts: "t", tick: 1 });
    acct.snapshot(120);
    const s2 = acct.snapshot(110);
    expect(s2.drawdownPct).toBeCloseTo((1020 - 1040) / 1040, 6);
  });
});
