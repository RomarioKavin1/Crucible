import type { TraceEntry } from "@crucible/core";

export interface PatternRule {
  id: string;
  title: string;
  detect: (entries: TraceEntry[]) => { confidence: "low" | "medium" | "high"; evidence: string[] } | null;
  remediation: string;
}

/** Sells within 5 ticks of a -3% drawdown. */
const PANIC_SELLER: PatternRule = {
  id: "PANIC_SELLER",
  title: "Panic seller — exits positions on sharp drawdowns instead of reassessing",
  detect: (entries) => {
    const evidence: string[] = [];
    let panicSells = 0;
    let totalSells = 0;
    for (const e of entries) {
      for (const f of e.fills) {
        if (f.side !== "sell") continue;
        totalSells++;
        if (e.portfolio.drawdownPct <= -0.03) {
          panicSells++;
          evidence.push(`tick ${e.tick}: sell ${f.qty} @ ${f.price.toFixed(2)} during ${(e.portfolio.drawdownPct * 100).toFixed(2)}% drawdown`);
        }
      }
    }
    if (totalSells === 0 || panicSells / totalSells < 0.4) return null;
    const ratio = panicSells / totalSells;
    return {
      confidence: ratio > 0.7 ? "high" : "medium",
      evidence: evidence.slice(0, 5),
    };
  },
  remediation: "Add to system prompt: 'Do not sell purely in response to drawdowns. First reassess thesis using news and price action.'",
};

/** Places orders in >50% of ticks (overtrading) */
const OVERTRADER: PatternRule = {
  id: "OVERTRADER",
  title: "Overtrader — places orders on too many ticks, burning slippage",
  detect: (entries) => {
    if (entries.length === 0) return null;
    const ticksWithFills = entries.filter((e) => e.fills.length > 0).length;
    const ratio = ticksWithFills / entries.length;
    if (ratio < 0.5) return null;
    return {
      confidence: ratio > 0.8 ? "high" : "medium",
      evidence: [`${ticksWithFills}/${entries.length} ticks had at least one fill (${(ratio * 100).toFixed(0)}%)`],
    };
  },
  remediation: "Add to system prompt: 'Only trade when you have a clear edge. Hold positions when no new information arrives.'",
};

/** Never reads news_feed despite news arriving */
const NEWS_BLIND: PatternRule = {
  id: "NEWS_BLIND",
  title: "News-blind — never queries news despite headlines arriving",
  detect: (entries) => {
    const ticksWithNews = entries.filter((e) => e.newsSeen.length > 0).length;
    const ticksWithNewsCall = entries.filter((e) =>
      e.agent.toolCalls.some((tc) => tc.name === "get_news_feed")
    ).length;
    if (ticksWithNews === 0) return null;
    if (ticksWithNewsCall > 0) return null;
    return {
      confidence: ticksWithNews >= 2 ? "high" : "medium",
      evidence: [`${ticksWithNews} ticks had news arrive but get_news_feed was never called`],
    };
  },
  remediation: "Add to system prompt: 'When news arrives in the snapshot, always call get_news_feed before trading.'",
};

/** Never uses stop-loss skill */
const NO_STOP_LOSS: PatternRule = {
  id: "NO_STOP_LOSS",
  title: "No stop-loss discipline — never uses set_stop_loss",
  detect: (entries) => {
    const fills = entries.flatMap((e) => e.fills);
    if (fills.length < 2) return null;
    const stopUses = entries.filter((e) =>
      e.agent.toolCalls.some((tc) => tc.name === "set_stop_loss")
    ).length;
    if (stopUses > 0) return null;
    return {
      confidence: "medium",
      evidence: [`${fills.length} fills executed but set_stop_loss was never called`],
    };
  },
  remediation: "Consider adding stop-loss orders after entry to bound downside.",
};

/** Trades again within 1 tick of a losing trade (revenge trading / tilt) */
const TILTED_AFTER_LOSS: PatternRule = {
  id: "TILTED_AFTER_LOSS",
  title: "Tilted after loss — re-enters within 1 tick of a losing close",
  detect: (entries) => {
    const evidence: string[] = [];
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]!;
      const cur = entries[i]!;
      const prevHadLosingClose =
        prev.portfolio.realizedPnl < (entries[Math.max(0, i - 2)]?.portfolio.realizedPnl ?? 0);
      if (prevHadLosingClose && cur.fills.length > 0) {
        evidence.push(`tick ${cur.tick}: re-entered immediately after losing close at tick ${prev.tick}`);
      }
    }
    if (evidence.length === 0) return null;
    return {
      confidence: evidence.length >= 2 ? "high" : "medium",
      evidence: evidence.slice(0, 3),
    };
  },
  remediation: "Add to system prompt: 'After a losing close, wait at least 3 ticks and re-read market context before re-entering.'",
};

export const PATTERN_LIBRARY: PatternRule[] = [
  PANIC_SELLER,
  OVERTRADER,
  NEWS_BLIND,
  NO_STOP_LOSS,
  TILTED_AFTER_LOSS,
];
