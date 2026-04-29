import type { Side } from "./types.js";

export interface SlippageParams {
  readonly baseBps: number;
  readonly impactCoeff: number;
}

export const DEFAULT_SLIPPAGE: SlippageParams = {
  baseBps: 1,
  impactCoeff: 5,
};

/**
 * Market-order slippage: fill at mid * (1 + side_sign * (baseBps + impactBps)/10000).
 * impactBps = impactCoeff * (orderQty / availableTop10Depth).
 */
export function marketFillPrice(args: {
  mid: number;
  side: Side;
  qty: number;
  top10Depth: number;
  params?: SlippageParams;
}): number {
  const p = args.params ?? DEFAULT_SLIPPAGE;
  const depth = Math.max(args.top10Depth, 1e-9);
  const impactBps = p.impactCoeff * (args.qty / depth);
  const totalBps = p.baseBps + impactBps;
  const sign = args.side === "buy" ? 1 : -1;
  return args.mid * (1 + (sign * totalBps) / 10_000);
}
