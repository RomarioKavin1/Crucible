import type {
  AgentStepRecord,
  EngineHandle,
  Fill,
  MarketSnapshot,
  NewsItem,
  Order,
  OrderBookSnapshot,
  OrderSide,
  Tick,
  TraceEntry,
} from "./types.js";
import { LocalOrderBook, computeMarketFillPrice } from "./orderbook.js";
import { PortfolioAccount } from "./portfolio.js";
import type { Scenario } from "./scenario.js";
import type { RunRecorder } from "./recorder.js";
import { computeScorecard, type Scorecard } from "./scoring.js";

// The agent's per-tick step. The engine drives the loop and the caller wires
// the SkillRuntime (from @crucible/skills) over the EngineHandle exposed by
// engine.getEngineHandle().
export type StepFn = (snapshot: MarketSnapshot) => Promise<AgentStepRecord>;

export interface RunResult {
  scorecard: Scorecard;
  ticksProcessed: number;
}

export class ScenarioEngine {
  private orderBook = new LocalOrderBook();
  private portfolio: PortfolioAccount;
  private journal = new Map<string, string>();
  private nextOrderId = 1;
  private currentTickIndex = 0;
  private currentMarket: Tick;
  private newsCursor = 0;
  private equityCurve: number[] = [];
  private tradeReturns: number[] = [];
  private lastEntryEquity: number | null = null;
  private pendingMarketFills: Fill[] = [];

  constructor(
    private readonly scenario: Scenario,
    private readonly recorder: RunRecorder
  ) {
    this.portfolio = new PortfolioAccount(scenario.startingState);
    this.currentMarket = scenario.ticks[0]!;
  }

  // Public so callers can wrap it with a SkillRuntime from @crucible/skills.
  getEngineHandle(): EngineHandle {
    const eng = this;
    return {
      getCurrentTick: () => eng.currentTickIndex,
      getMarket: () => eng.currentMarket,
      getOrderbook: () => ({
        ts: eng.currentMarket.ts,
        bids: [{ price: eng.currentMarket.bid, qty: 100 }],
        asks: [{ price: eng.currentMarket.ask, qty: 100 }],
      }),
      getRecentTrades: () => [],
      getNewsSince: (sinceTs?: string) => {
        if (!sinceTs) return [];
        return eng.scenario.news.filter((n) => n.ts > sinceTs && n.ts <= eng.currentMarket.ts);
      },
      getPosition: () => eng.portfolio.snapshot(eng.currentMarket.last).position,
      getCash: () => eng.portfolio.snapshot(eng.currentMarket.last).cash,
      getPnl: () => {
        const s = eng.portfolio.snapshot(eng.currentMarket.last);
        return { realized: s.realizedPnl, unrealized: s.unrealizedPnl };
      },
      getOpenOrders: () => eng.orderBook.openOrders(),
      placeMarketOrder: (side: OrderSide, qty: number) => {
        const slip = computeMarketFillPrice({
          side,
          qty,
          topDepth: 100,
          mid: eng.currentMarket.mid,
          base_bps: eng.scenario.manifest.slippage.base_bps,
          impact_coeff: eng.scenario.manifest.slippage.impact_coeff,
        });
        const id = `m-${eng.nextOrderId++}`;
        eng.pendingMarketFills.push({
          orderId: id,
          side,
          qty,
          price: slip,
          feeBps: 0,
          ts: eng.currentMarket.ts,
          tick: eng.currentTickIndex,
        });
        return { id, fillPrice: slip };
      },
      placeLimitOrder: (side: OrderSide, qty: number, price: number, ttlTicks?: number) => {
        const id = `l-${eng.nextOrderId++}`;
        const order: Order = {
          id, side, type: "limit", qty, price, ttlTicks: ttlTicks ?? 100, createdAtTick: eng.currentTickIndex,
        };
        eng.orderBook.add(order);
        return { id };
      },
      cancelOrder: (id: string) => eng.orderBook.cancel(id),
      journalRead: (key: string) => eng.journal.get(key) ?? null,
      journalWrite: (key: string, note: string) => {
        eng.journal.set(key, note);
      },
    };
  }

  async run(stepFn: StepFn): Promise<RunResult> {
    const ticks = this.scenario.ticks;
    for (let i = 0; i < ticks.length; i++) {
      this.currentTickIndex = i;
      this.currentMarket = ticks[i]!;

      // Settle any resting limit orders against this tick
      const limitFills = this.orderBook.matchAgainstTape(this.currentMarket, i);
      for (const f of limitFills) {
        this.portfolio.applyFill(f);
        this.recordTradeReturn();
      }
      const recordedFills: Fill[] = [...limitFills];

      const snapshot = this.buildSnapshot();
      const stepRecord = await stepFn(snapshot);

      // Drain any market fills produced by the agent's tool calls
      while (this.pendingMarketFills.length) {
        const f = this.pendingMarketFills.shift()!;
        this.portfolio.applyFill(f);
        recordedFills.push(f);
        this.recordTradeReturn();
      }

      const portfolioAfter = this.portfolio.snapshot(this.currentMarket.last);
      const entry: TraceEntry = {
        tick: i,
        ts: this.currentMarket.ts,
        market: this.currentMarket,
        newsSeen: snapshot.newsSinceLastTick,
        agent: stepRecord,
        fills: recordedFills,
        portfolio: portfolioAfter,
      };
      await this.recorder.append(entry);

      const equity = portfolioAfter.cash + portfolioAfter.position * this.currentMarket.last;
      this.equityCurve.push(equity);
      this.lastEntryEquity = equity;
    }
    await this.recorder.close();

    const scorecard = computeScorecard(this.equityCurve, this.tradeReturns);
    return { scorecard, ticksProcessed: ticks.length };
  }

  private buildSnapshot(): MarketSnapshot {
    const ts = this.currentMarket.ts;
    const newsSlice: NewsItem[] = [];
    while (
      this.newsCursor < this.scenario.news.length &&
      this.scenario.news[this.newsCursor]!.ts <= ts
    ) {
      newsSlice.push(this.scenario.news[this.newsCursor]!);
      this.newsCursor++;
    }
    const ob: OrderBookSnapshot = {
      ts,
      bids: [{ price: this.currentMarket.bid, qty: 100 }],
      asks: [{ price: this.currentMarket.ask, qty: 100 }],
    };
    return {
      tick: this.currentTickIndex,
      ts,
      market: this.currentMarket,
      orderbook: ob,
      newsSinceLastTick: newsSlice,
      portfolio: this.portfolio.snapshot(this.currentMarket.last),
      openOrders: this.orderBook.openOrders(),
    };
  }

  private recordTradeReturn(): void {
    if (this.lastEntryEquity === null) return;
    const s = this.portfolio.snapshot(this.currentMarket.last);
    const cur = s.cash + s.position * this.currentMarket.last;
    this.tradeReturns.push(cur - this.lastEntryEquity);
    this.lastEntryEquity = cur;
  }
}
