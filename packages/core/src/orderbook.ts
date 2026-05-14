import type { Fill, Order, OrderSide, Tick } from "./types";

export interface SlippageInputs {
  side: OrderSide;
  qty: number;
  topDepth: number;
  mid: number;
  base_bps: number;
  impact_coeff: number;
}

export function computeMarketFillPrice(inputs: SlippageInputs): number {
  const { side, qty, topDepth, mid, base_bps, impact_coeff } = inputs;
  const safeDepth = topDepth > 0 ? topDepth : 1;
  const impact_bps = impact_coeff * (qty / safeDepth);
  const total_bps = base_bps + impact_bps;
  const sign = side === "buy" ? 1 : -1;
  return mid * (1 + sign * (total_bps / 10_000));
}

export class LocalOrderBook {
  private resting = new Map<string, Order>();

  add(order: Order): void {
    if (order.type !== "limit") {
      throw new Error("Only limit orders rest in the book");
    }
    if (order.price === undefined) {
      throw new Error("Limit order requires a price");
    }
    this.resting.set(order.id, order);
  }

  cancel(id: string): boolean {
    return this.resting.delete(id);
  }

  openOrders(): Order[] {
    return Array.from(this.resting.values());
  }

  matchAgainstTape(tick: Tick, tickIndex: number): Fill[] {
    const fills: Fill[] = [];
    for (const order of Array.from(this.resting.values())) {
      const tradesThrough =
        (order.side === "buy" && tick.last <= order.price!) ||
        (order.side === "sell" && tick.last >= order.price!);

      if (tradesThrough) {
        fills.push({
          orderId: order.id,
          side: order.side,
          qty: order.qty,
          price: order.price!,
          feeBps: 0,
          ts: tick.ts,
          tick: tickIndex,
        });
        this.resting.delete(order.id);
        continue;
      }

      // Expire if TTL elapsed (order survives for ttlTicks ticks, expires after)
      if (
        order.ttlTicks !== undefined &&
        tickIndex - order.createdAtTick > order.ttlTicks
      ) {
        this.resting.delete(order.id);
      }
    }
    return fills;
  }
}
