import type { NewsItem, Tick } from "@crucible/core";

export interface InputNews {
  at: string;
  headline: string;
  source: string;
  body?: string;
}

export function mapInputNews(items: InputNews[], ticks: Tick[]): NewsItem[] {
  if (ticks.length === 0) return [];
  const tickTimes = ticks.map((t) => new Date(t.ts).getTime());
  const firstT = tickTimes[0]!;
  const lastT = tickTimes[tickTimes.length - 1]!;
  const out: NewsItem[] = [];
  for (const n of items) {
    const at = new Date(n.at).getTime();
    if (at < firstT || at > lastT) continue;
    let bestIdx = 0;
    let bestDist = Math.abs(at - tickTimes[0]!);
    for (let i = 1; i < tickTimes.length; i++) {
      const d = Math.abs(at - tickTimes[i]!);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    out.push({ ts: ticks[bestIdx]!.ts, headline: n.headline, body: n.body ?? "", source: n.source });
  }
  return out;
}
