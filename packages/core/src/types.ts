// Core types shared across the scenario engine, skills, recorder, and coach.

export type Side = "buy" | "sell";

export interface Tick {
  readonly tick: number;
  readonly ts: string; // ISO-8601, UTC
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
}

export interface NewsItem {
  readonly ts: string;
  readonly headline: string;
  readonly body?: string;
  readonly source: string;
}

export interface Portfolio {
  readonly cash: number;
  readonly position: number;
  readonly unrealizedPnl: number;
  readonly drawdownPct: number;
}

export interface MarketSnapshot {
  readonly mid: number;
  readonly bestBid: number;
  readonly bestAsk: number;
  readonly depthTop10: number;
}

export interface Decision {
  readonly toolCalls: ReadonlyArray<{ name: string; args: unknown; result?: unknown }>;
  readonly completions: ReadonlyArray<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    content: string;
  }>;
}

export interface TraceEntry {
  readonly tick: number;
  readonly ts: string;
  readonly market: MarketSnapshot;
  readonly newsSeen: ReadonlyArray<NewsItem>;
  readonly agent: Decision;
  readonly portfolio: Portfolio;
}
