export interface FetchKlinesOpts {
  symbol: string;
  interval: string;   // e.g. "1s", "1m", "10s" → mapped to Binance accepted values
  startMs: number;
  endMs: number;
}

const BASE = "https://api.binance.com/api/v3/klines";
const PAGE_LIMIT = 1000;

/** Map a tick_interval_ms-friendly label to Binance's accepted interval string. */
function normalizeInterval(interval: string): string {
  // Binance does NOT accept "1s", "10s", "30s" — only ≥1m.
  if (interval.endsWith("s")) return "1m";
  return interval;
}

export async function fetchBinanceKlines(opts: FetchKlinesOpts): Promise<unknown[][]> {
  const out: unknown[][] = [];
  let cursor = opts.startMs;
  const binanceInterval = normalizeInterval(opts.interval);
  while (cursor < opts.endMs) {
    const url = `${BASE}?symbol=${opts.symbol}&interval=${binanceInterval}&startTime=${cursor}&endTime=${opts.endMs}&limit=${PAGE_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance klines fetch failed: ${res.status} ${res.statusText}`);
    }
    const page = (await res.json()) as unknown[][];
    if (page.length === 0) break;
    out.push(...page);
    const lastOpenTime = Number(page[page.length - 1]![0]);
    if (page.length < PAGE_LIMIT) break;
    cursor = lastOpenTime + 1;
  }
  return out;
}
