import type { Portfolio } from "@crucible/core";

export interface RiskGateway {
  setStopLoss(price: number): Promise<void>;
  setTakeProfit(price: number): Promise<void>;
  getPosition(): Promise<number>;
  getBalance(): Promise<number>;
  getPnl(): Promise<{ unrealized: number; realized: number }>;
  getPortfolio(): Promise<Portfolio>;
}
