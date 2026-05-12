import { describe, it, expect, beforeEach } from "vitest";
import { SkillRuntime, type EngineHandle } from "../src/runtime.js";
import { SKILL_DEFINITIONS } from "../src/definitions.js";

function fakeEngine(): EngineHandle & { _placedOrders: unknown[] } {
  const _placedOrders: unknown[] = [];
  return {
    _placedOrders,
    getCurrentTick: () => 5,
    getMarket: () => ({ ts: "t", mid: 100, bid: 99.9, ask: 100.1, last: 100, volume: 1 }),
    getOrderbook: () => ({
      ts: "t",
      bids: [{ price: 99.9, qty: 10 }],
      asks: [{ price: 100.1, qty: 10 }],
    }),
    getRecentTrades: () => [],
    getNewsSince: () => [],
    getPosition: () => 0,
    getCash: () => 1000,
    getPnl: () => ({ realized: 0, unrealized: 0 }),
    getOpenOrders: () => [],
    placeMarketOrder: (side, qty) => {
      _placedOrders.push({ kind: "market", side, qty });
      return { id: "ord-1", fillPrice: 100 };
    },
    placeLimitOrder: (side, qty, price, ttlTicks) => {
      _placedOrders.push({ kind: "limit", side, qty, price, ttlTicks });
      return { id: "ord-2" };
    },
    cancelOrder: () => true,
    journalRead: () => null,
    journalWrite: () => undefined,
  };
}

describe("SKILL_DEFINITIONS", () => {
  it("includes the documented core skills", () => {
    const names = SKILL_DEFINITIONS.map((d) => d.name);
    expect(names).toContain("get_price");
    expect(names).toContain("get_orderbook");
    expect(names).toContain("get_news_feed");
    expect(names).toContain("market_buy");
    expect(names).toContain("market_sell");
    expect(names).toContain("limit_order");
    expect(names).toContain("cancel_order");
    expect(names).toContain("get_position");
    expect(names).toContain("get_balance");
    expect(names).toContain("get_pnl");
    expect(names).toContain("journal_read");
    expect(names).toContain("journal_write");
  });
});

describe("SkillRuntime", () => {
  let engine: ReturnType<typeof fakeEngine>;
  let rt: SkillRuntime;

  beforeEach(() => {
    engine = fakeEngine();
    rt = new SkillRuntime(engine);
  });

  it("get_price returns market data", async () => {
    const r = await rt.execute("get_price", {});
    expect((r as { mid: number }).mid).toBe(100);
  });

  it("market_buy delegates to placeMarketOrder", async () => {
    await rt.execute("market_buy", { qty: 1.5 });
    expect(engine._placedOrders).toEqual([{ kind: "market", side: "buy", qty: 1.5 }]);
  });

  it("limit_order validates side enum", async () => {
    await expect(
      rt.execute("limit_order", { side: "wrong", qty: 1, price: 100 })
    ).rejects.toThrow();
  });

  it("returns an error envelope for an unknown skill", async () => {
    await expect(rt.execute("nope", {})).rejects.toThrow(/Unknown skill/);
  });
});
