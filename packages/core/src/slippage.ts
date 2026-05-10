import type { Side } from "./types.js";

export interface SlippageParams {
  readonly baseBps: number;
  readonly impactCoeff: number;
  /** Hard cap on impact contribution, in bps. Prevents thin-book blowups. */
  readonly maxImpactBps: number;
}

export const DEFAULT_SLIPPAGE: SlippageParams = {
  baseBps: 1,
  impactCoeff: 5,
  maxImpactBps: 250,
};

export function marketFillPrice(args: {
  mid: number;
  side: Side;
  qty: number;
  top10Depth: number;
  params?: SlippageParams;
}): number {
  const p = args.params ?? DEFAULT_SLIPPAGE;
  const depth = Math.max(args.top10Depth, 1e-9);
  const rawImpactBps = p.impactCoeff * (args.qty / depth);
  const impactBps = Math.min(rawImpactBps, p.maxImpactBps);
  const totalBps = p.baseBps + impactBps;
  const sign = args.side === "buy" ? 1 : -1;
  return args.mid * (1 + (sign * totalBps) / 10_000);
}
