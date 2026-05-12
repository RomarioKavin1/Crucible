export interface Tick {
  ts: string;             // ISO 8601
  mid: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  qty: number;
}

export interface OrderBookSnapshot {
  ts: string;
  bids: OrderBookLevel[]; // descending by price
  asks: OrderBookLevel[]; // ascending by price
}

export interface NewsItem {
  ts: string;
  headline: string;
  body: string;
  source: string;
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export interface Order {
  id: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price?: number;        // required for limit, ignored for market
  ttlTicks?: number;     // optional for limit; null = good-till-cancel
  createdAtTick: number;
}

export interface Fill {
  orderId: string;
  side: OrderSide;
  qty: number;
  price: number;
  feeBps: number;
  ts: string;
  tick: number;
}

export interface Portfolio {
  cash: number;
  position: number;          // signed: + long, - short
  realizedPnl: number;
  unrealizedPnl: number;
  highWaterEquity: number;   // for drawdown calc
  drawdownPct: number;       // current drawdown from HWM as fraction
}

export interface MarketSnapshot {
  tick: number;
  ts: string;
  market: Tick;
  orderbook: OrderBookSnapshot;
  newsSinceLastTick: NewsItem[];
  portfolio: Portfolio;
  openOrders: Order[];
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentCompletion {
  model: string;
  inputTokens: number;
  outputTokens: number;
  content: string;
}

export interface AgentStepRecord {
  completions: AgentCompletion[];
  toolCalls: AgentToolCall[];
}

export interface TraceEntry {
  tick: number;
  ts: string;
  market: Tick;
  newsSeen: NewsItem[];
  agent: AgentStepRecord;
  fills: Fill[];
  portfolio: Portfolio;
}

// Read+write surface the engine exposes to a SkillRuntime. Defined here so
// @crucible/skills can import it from @crucible/core without a cycle.
export interface EngineHandle {
  getCurrentTick(): number;
  getMarket(): Tick;
  getOrderbook(depth?: number): {
    ts: string;
    bids: { price: number; qty: number }[];
    asks: { price: number; qty: number }[];
  };
  getRecentTrades(n?: number): {
    ts: string;
    price: number;
    qty: number;
    side: OrderSide;
  }[];
  getNewsSince(sinceTs?: string): NewsItem[];
  getPosition(): number;
  getCash(): number;
  getPnl(): { realized: number; unrealized: number };
  getOpenOrders(): {
    id: string;
    side: OrderSide;
    qty: number;
    price?: number;
    type: "limit" | "market";
  }[];
  placeMarketOrder(side: OrderSide, qty: number): { id: string; filled_at: number };
  placeLimitOrder(
    side: OrderSide,
    qty: number,
    price: number,
    ttl_ticks?: number
  ): { id: string };
  cancelOrder(id: string): boolean;
  journalRead(key: string): string | null;
  journalWrite(key: string, note: string): void;
}
