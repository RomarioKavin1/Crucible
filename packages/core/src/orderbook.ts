import type { Side, Tick } from "./types.js";

export interface RestingOrder {
  readonly id: string;
  readonly side: Side;
  readonly qty: number;
  readonly limitPrice: number;
  readonly placedTick: number;
  readonly ttlTicks: number;
}

export interface Fill {
  readonly orderId: string;
  readonly qty: number;
  readonly price: number;
}

/**
 * Resting-order book backed by the recorded tape. Fixed price tape: agent
 * trades do not move the recorded market.
 *
 * Fills if and only if the tape trades through the limit price. Limits fill
 * at exactly the limit (no slippage). Expired orders are dropped.
 */
export class LocalBook {
  private orders = new Map<string, RestingOrder>();

  place(order: RestingOrder): void {
    this.orders.set(order.id, order);
  }

  cancel(id: string): boolean {
    return this.orders.delete(id);
  }

  matchAgainstTape(tick: Tick): Fill[] {
    const fills: Fill[] = [];
    for (const o of [...this.orders.values()]) {
      if (tick.tick - o.placedTick > o.ttlTicks) {
        this.orders.delete(o.id);
        continue;
      }
      const trough = Math.min(tick.bid, tick.last);
      const peak = Math.max(tick.ask, tick.last);
      const fills_buy = o.side === "buy" && trough <= o.limitPrice;
      const fills_sell = o.side === "sell" && peak >= o.limitPrice;
      if (fills_buy || fills_sell) {
        fills.push({ orderId: o.id, qty: o.qty, price: o.limitPrice });
        this.orders.delete(o.id);
      }
    }
    return fills;
  }
}
