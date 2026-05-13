import type { Fill, Portfolio } from "./types";

interface InitialState {
  cash: number;
  position: number;
}

export class PortfolioAccount {
  private cash: number;
  private position: number;
  private avgEntryPrice = 0;
  private realizedPnl = 0;
  private highWaterEquity: number;

  constructor(initial: InitialState) {
    this.cash = initial.cash;
    this.position = initial.position;
    this.highWaterEquity = initial.cash;
  }

  applyFill(fill: Fill): void {
    const notional = fill.qty * fill.price;
    const fee = notional * (fill.feeBps / 10_000);
    if (fill.side === "buy") {
      // Adjust avg entry for the new long size; if covering a short, realize PnL.
      if (this.position < 0) {
        const closeQty = Math.min(fill.qty, -this.position);
        const pnl = closeQty * (this.avgEntryPrice - fill.price);
        this.realizedPnl += pnl;
        this.position += closeQty;
        this.cash -= closeQty * fill.price;
        const remaining = fill.qty - closeQty;
        if (remaining > 0) {
          this.avgEntryPrice = fill.price;
          this.position += remaining;
          this.cash -= remaining * fill.price;
        }
      } else {
        // Adding to (or opening) a long
        const newPosition = this.position + fill.qty;
        this.avgEntryPrice =
          (this.avgEntryPrice * this.position + fill.price * fill.qty) /
          newPosition;
        this.position = newPosition;
        this.cash -= notional;
      }
    } else {
      // sell
      if (this.position > 0) {
        const closeQty = Math.min(fill.qty, this.position);
        const pnl = closeQty * (fill.price - this.avgEntryPrice);
        this.realizedPnl += pnl;
        this.position -= closeQty;
        this.cash += closeQty * fill.price;
        const remaining = fill.qty - closeQty;
        if (remaining > 0) {
          this.avgEntryPrice = fill.price;
          this.position -= remaining;
          this.cash += remaining * fill.price;
        }
      } else {
        // Adding to (or opening) a short
        const newPositionAbs = Math.abs(this.position) + fill.qty;
        this.avgEntryPrice =
          (this.avgEntryPrice * Math.abs(this.position) + fill.price * fill.qty) /
          newPositionAbs;
        this.position -= fill.qty;
        this.cash += notional;
      }
    }
    this.cash -= fee;
  }

  snapshot(currentPrice: number): Portfolio {
    const unrealizedPnl =
      this.position === 0
        ? 0
        : this.position * (currentPrice - this.avgEntryPrice);
    const equity = this.cash + this.position * currentPrice;
    if (equity > this.highWaterEquity) this.highWaterEquity = equity;
    const drawdownPct =
      this.highWaterEquity === 0
        ? 0
        : (equity - this.highWaterEquity) / this.highWaterEquity;
    return {
      cash: this.cash,
      position: this.position,
      realizedPnl: this.realizedPnl,
      unrealizedPnl,
      highWaterEquity: this.highWaterEquity,
      drawdownPct,
    };
  }
}
