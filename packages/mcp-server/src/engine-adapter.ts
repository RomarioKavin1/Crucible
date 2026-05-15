// packages/mcp-server/src/engine-adapter.ts
import {
  loadScenario,
  PortfolioAccount,
  computeMarketFillPrice,
  computeScorecard,
} from "@crucible/core";
import type { Scenario, Tick, NewsItem, Fill, Scorecard } from "@crucible/core";

export interface SessionAction {
  kind: "market_buy" | "market_sell" | "noop";
  qty: bigint; // 1e18-scaled units
  reasoning: string;
  signature?: string;
  signer?: string;
}

export interface Observation {
  tickId: number;
  price: number;
  bid: number;
  ask: number;
  position: number;
  cash: number;
  equity: number;
  news: NewsItem[];
  ticksRemaining: number;
}

export interface InitOpts {
  scenarioDir: string;
}

export interface ApplyActionResult {
  fill?: Fill;
}

interface TraceLine {
  tickId: number;
  observation: Observation;
  action: { kind: string; qty: string; reasoning: string };
  signature: string | null;
  signer: string | null;
}

export class EngineSession {
  private scenario: Scenario;
  private portfolio: PortfolioAccount;
  private cursor = 0;
  private trace: TraceLine[] = [];
  private equityCurve: number[] = [];
  private tradeReturns: number[] = [];
  private lastEquity: number | null = null;
  private nextOrderId = 1;
  // Cursor tracking for news: how many news items have already been delivered
  private newsCursor = 0;

  private constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.portfolio = new PortfolioAccount(scenario.startingState);
  }

  static async init(opts: InitOpts): Promise<EngineSession> {
    const scenario = await loadScenario(opts.scenarioDir);
    return new EngineSession(scenario);
  }

  isDone(): boolean {
    return this.cursor >= this.scenario.ticks.length;
  }

  private get tick(): Tick {
    const t = this.scenario.ticks[this.cursor];
    if (!t) throw new Error("EngineSession: no current tick (cursor past end)");
    return t;
  }

  currentObservation(): Observation {
    const t = this.tick;
    const snapshot = this.portfolio.snapshot(t.last);

    // Collect news items up to and including current tick's timestamp,
    // mirroring ScenarioEngine.buildSnapshot()'s news cursor approach.
    const news: NewsItem[] = [];
    let nc = this.newsCursor;
    while (nc < this.scenario.news.length && this.scenario.news[nc]!.ts <= t.ts) {
      news.push(this.scenario.news[nc]!);
      nc++;
    }

    return {
      tickId: this.cursor,
      price: t.last,
      bid: t.bid,
      ask: t.ask,
      position: snapshot.position,
      cash: snapshot.cash,
      equity: snapshot.cash + snapshot.position * t.last,
      news,
      ticksRemaining: this.scenario.ticks.length - this.cursor,
    };
  }

  applyAction(action: SessionAction): ApplyActionResult {
    const obsBefore = this.currentObservation();
    let fill: Fill | undefined;
    const qtyUnits = Number(action.qty) / 1e18;

    if (action.kind === "market_buy" || action.kind === "market_sell") {
      const side = action.kind === "market_buy" ? "buy" : "sell";
      const fillPrice = computeMarketFillPrice({
        side,
        qty: qtyUnits,
        topDepth: 100,
        mid: this.tick.mid,
        base_bps: this.scenario.manifest.slippage.base_bps,
        impact_coeff: this.scenario.manifest.slippage.impact_coeff,
      });
      fill = {
        orderId: `m-${this.nextOrderId++}`,
        side,
        qty: qtyUnits,
        price: fillPrice,
        feeBps: 0,
        ts: this.tick.ts,
        tick: this.cursor,
      };
      this.portfolio.applyFill(fill);
      this.recordTradeReturn();
    }

    this.trace.push({
      tickId: this.cursor,
      observation: obsBefore,
      action: {
        kind: action.kind,
        qty: action.qty.toString(),
        reasoning: action.reasoning,
      },
      signature: action.signature ?? null,
      signer: action.signer ?? null,
    });

    return { fill };
  }

  advance(): void {
    if (this.isDone()) return;
    const t = this.tick;
    const portfolioAfter = this.portfolio.snapshot(t.last);
    const equity = portfolioAfter.cash + portfolioAfter.position * t.last;
    this.equityCurve.push(equity);
    this.lastEquity = equity;

    // Advance the news cursor past everything delivered for this tick
    while (
      this.newsCursor < this.scenario.news.length &&
      this.scenario.news[this.newsCursor]!.ts <= t.ts
    ) {
      this.newsCursor++;
    }

    this.cursor += 1;
  }

  finalize(): { scorecard: Scorecard; traceJsonl: string } {
    const scorecard = computeScorecard(this.equityCurve, this.tradeReturns);
    const traceJsonl =
      this.trace.map((l) => JSON.stringify(l)).join("\n") +
      (this.trace.length ? "\n" : "");
    return { scorecard, traceJsonl };
  }

  private recordTradeReturn(): void {
    if (this.lastEquity === null) return;
    const s = this.portfolio.snapshot(this.tick.last);
    const cur = s.cash + s.position * this.tick.last;
    this.tradeReturns.push(cur - this.lastEquity);
    this.lastEquity = cur;
  }
}
