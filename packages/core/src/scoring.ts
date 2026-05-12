function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function downsideStd(returns: number[], target = 0): number {
  if (returns.length === 0) return 0;
  // Standard semi-deviation: variance of (r - target)^2 for r < target,
  // normalized by full series length (NOT just downside count).
  const variance = returns
    .filter((r) => r < target)
    .reduce((acc, r) => acc + (r - target) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export function sortinoRatio(returns: number[]): number {
  if (returns.every((r) => r === 0)) return 0;
  const avg = mean(returns);
  const dStd = downsideStd(returns);
  if (dStd === 0) return 1e6; // sanitize +Infinity
  return avg / dStd;
}

export function maxDrawdownPct(equityCurve: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of equityCurve) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

export function totalReturnPct(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  const start = equityCurve[0]!;
  const end = equityCurve[equityCurve.length - 1]!;
  return end / start - 1;
}

export function winRate(tradeReturns: number[]): number {
  if (tradeReturns.length === 0) return 0;
  const wins = tradeReturns.filter((r) => r > 0).length;
  return wins / tradeReturns.length;
}

export interface Scorecard {
  sortino: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  winRate: number;
}

export function computeScorecard(equityCurve: number[], tradeReturns: number[]): Scorecard {
  const equityReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!;
    const cur = equityCurve[i]!;
    if (prev !== 0) equityReturns.push(cur / prev - 1);
  }
  return {
    sortino: sortinoRatio(equityReturns),
    maxDrawdownPct: maxDrawdownPct(equityCurve),
    totalReturnPct: totalReturnPct(equityCurve),
    winRate: winRate(tradeReturns),
  };
}
