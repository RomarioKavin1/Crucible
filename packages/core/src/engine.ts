import type { Decision, MarketSnapshot, Portfolio, Tick, TraceEntry } from "./types.js";

export interface ScenarioSource {
  next(): Tick | null;
}

export interface AgentRunner {
  step(input: {
    market: MarketSnapshot;
    portfolio: Portfolio;
  }): Promise<Decision>;
}

export interface Recorder {
  append(entry: TraceEntry): void;
}

export interface EngineOptions {
  readonly llmCompletionCap: number;
  readonly toolCallCap: number;
  /** Wall-clock cap in ms. Practice mode only. */
  readonly wallClockMs: number | null;
}

const DEFAULTS: EngineOptions = {
  llmCompletionCap: 5,
  toolCallCap: 20,
  wallClockMs: 30_000,
};

export async function run(
  scenario: ScenarioSource,
  agent: AgentRunner,
  recorder: Recorder,
  opts: Partial<EngineOptions> = {},
): Promise<void> {
  const cfg = { ...DEFAULTS, ...opts };

  // Skeleton — portfolio + slippage + matching come next.
  // For now, walk the tape and call the agent each tick with a stub snapshot.

  let cash = 10_000;
  let position = 0;

  for (;;) {
    const tick = scenario.next();
    if (!tick) break;

    const market: MarketSnapshot = {
      mid: (tick.bid + tick.ask) / 2,
      bestBid: tick.bid,
      bestAsk: tick.ask,
      depthTop10: 0, // TODO: pull from orderbook bundle
    };

    const portfolio: Portfolio = {
      cash,
      position,
      unrealizedPnl: position * (market.mid - 0),
      drawdownPct: 0,
    };

    const decision = await agent.step({ market, portfolio });

    recorder.append({
      tick: tick.tick,
      ts: tick.ts,
      market,
      newsSeen: [],
      agent: decision,
      portfolio,
    });

    // TODO: caps enforcement, news buffer, slippage, fills.
    void cfg;
  }
}
