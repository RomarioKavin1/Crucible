// Market-data skills (read-only). Implementations are thin IPC wrappers
// to the running Scenario Engine — they never go to the real network.

import type { MarketSnapshot } from "@crucible/core";

export interface MarketGateway {
  getPrice(): Promise<number>;
  getOrderbook(depth: number): Promise<MarketSnapshot>;
  getRecentTrades(n: number): Promise<Array<{ ts: string; price: number; qty: number }>>;
  getVolatility(windowTicks: number): Promise<number>;
}
