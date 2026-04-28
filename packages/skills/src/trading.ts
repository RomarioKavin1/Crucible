import type { Side } from "@crucible/core";

export interface TradingGateway {
  marketBuy(qty: number): Promise<{ orderId: string; fillPrice: number }>;
  marketSell(qty: number): Promise<{ orderId: string; fillPrice: number }>;
  limitOrder(side: Side, qty: number, price: number, ttlTicks: number): Promise<{ orderId: string }>;
  cancelOrder(orderId: string): Promise<{ cancelled: boolean }>;
}
