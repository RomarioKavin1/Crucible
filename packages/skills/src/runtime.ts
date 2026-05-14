import { z } from "zod";
import type { EngineHandle, OrderSide } from "@crucible/core";

// Re-export for convenience so callers of @crucible/skills don't need to
// import EngineHandle separately from @crucible/core.
export type { EngineHandle, Order } from "@crucible/core";

const SideEnum = z.enum(["buy", "sell"]);

const ARG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  get_price: z.object({}).strict(),
  get_orderbook: z.object({ depth: z.number().int().min(1).max(50).optional() }).strict(),
  get_recent_trades: z.object({ n: z.number().int().min(1).max(100).optional() }).strict(),
  get_news_feed: z.object({ since_ts: z.string().optional() }).strict(),
  market_buy: z.object({ qty: z.number().positive() }).strict(),
  market_sell: z.object({ qty: z.number().positive() }).strict(),
  limit_order: z.object({
    side: SideEnum,
    qty: z.number().positive(),
    price: z.number().positive(),
    ttl_ticks: z.number().int().positive().optional(),
  }).strict(),
  cancel_order: z.object({ id: z.string() }).strict(),
  get_position: z.object({}).strict(),
  get_balance: z.object({}).strict(),
  get_pnl: z.object({}).strict(),
  journal_read: z.object({ key: z.string() }).strict(),
  journal_write: z.object({ key: z.string(), note: z.string() }).strict(),
};

export class SkillRuntime {
  constructor(private readonly engine: EngineHandle) {}

  async execute(name: string, args: unknown): Promise<unknown> {
    const schema = ARG_SCHEMAS[name];
    if (!schema) throw new Error(`Unknown skill: ${name}`);
    const a = schema.parse(args);
    const e = this.engine;

    switch (name) {
      case "get_price": {
        const m = e.getMarket();
        return { mid: m.mid, bid: m.bid, ask: m.ask, last: m.last, ts: m.ts };
      }
      case "get_orderbook":
        return e.getOrderbook((a as { depth?: number }).depth);
      case "get_recent_trades":
        return e.getRecentTrades((a as { n?: number }).n);
      case "get_news_feed":
        return e.getNewsSince((a as { since_ts?: string }).since_ts);
      case "market_buy":
        return e.placeMarketOrder("buy", (a as { qty: number }).qty);
      case "market_sell":
        return e.placeMarketOrder("sell", (a as { qty: number }).qty);
      case "limit_order": {
        const av = a as { side: OrderSide; qty: number; price: number; ttl_ticks?: number };
        return e.placeLimitOrder(av.side, av.qty, av.price, av.ttl_ticks);
      }
      case "cancel_order":
        return { cancelled: e.cancelOrder((a as { id: string }).id) };
      case "get_position":
        return { position: e.getPosition() };
      case "get_balance":
        return { cash: e.getCash() };
      case "get_pnl":
        return e.getPnl();
      case "journal_read":
        return { value: e.journalRead((a as { key: string }).key) };
      case "journal_write":
        e.journalWrite((a as { key: string; note: string }).key, (a as { key: string; note: string }).note);
        return { ok: true };
      default:
        throw new Error(`Unknown skill: ${name}`);
    }
  }
}
