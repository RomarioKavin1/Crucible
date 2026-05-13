import type { Tick } from "@crucible/core";

/** Convert Binance klines (REST raw rows) into a Tick[]. */
export function klinesToTicks(klines: unknown[][], bpsSpread: number): Tick[] {
  return klines.map((k) => {
    const openTime = Number(k[0]);
    const open = parseFloat(k[1] as string);
    const close = parseFloat(k[4] as string);
    const volume = parseFloat(k[5] as string);
    const mid = (open + close) / 2;
    const halfSpread = bpsSpread / 10000 / 2;
    return {
      ts: new Date(openTime).toISOString(),
      mid,
      bid: mid * (1 - halfSpread),
      ask: mid * (1 + halfSpread),
      last: close,
      volume,
    };
  });
}
