import type { TraceEntry, Fill } from "@crucible/core";
import type { TradeCritique } from "./types.js";

export function computeTradeCritiques(entries: TraceEntry[]): TradeCritique[] {
  const critiques: TradeCritique[] = [];
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry) return critiques;

  for (const entry of entries) {
    for (const fill of entry.fills) {
      const cf = computeCounterfactual(entries, fill);
      critiques.push({
        tick: fill.tick,
        ts: fill.ts,
        side: fill.side,
        qty: fill.qty,
        fillPrice: fill.price,
        counterfactualHold: cf,
        observation: phraseObservation(fill, cf),
      });
    }
  }
  return critiques;
}

function computeCounterfactual(
  entries: TraceEntry[],
  fill: Fill
): TradeCritique["counterfactualHold"] {
  const last = entries[entries.length - 1]!;
  const untilTick = last.tick;
  const untilPrice = last.market.last;
  // For both buy and sell, `(untilPrice - fillPrice) * qty` is the directional
  // PnL of the *opposite* of the action. For a sell, this represents the
  // opportunity cost of having sold (positive = sold too early in a rising
  // market). For a buy, this is the unrealized PnL of the position if held.
  const pnlIfHeld = fill.qty * (untilPrice - fill.price);
  return { untilTick, untilPrice, pnlIfHeld };
}

function phraseObservation(fill: Fill, cf: TradeCritique["counterfactualHold"]): string {
  const direction = fill.side === "buy" ? "bought" : "sold";
  const sign = cf.pnlIfHeld >= 0 ? "+" : "";
  return `${direction} ${fill.qty} @ ${fill.price.toFixed(2)}. By tick ${cf.untilTick} price was ${cf.untilPrice.toFixed(2)} (${sign}${cf.pnlIfHeld.toFixed(2)} if held).`;
}
