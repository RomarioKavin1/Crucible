import type { Tick } from "@crucible/core";

interface BaseOpts {
  ticks: number;
  tickIntervalMs: number;
  startTs: string;
  basePrice: number;
  seed: number;
}

/** Linear-congruential PRNG for deterministic outputs without bringing in a lib. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeTick(ts: string, price: number, bpsSpread = 5): Tick {
  const halfSpread = bpsSpread / 10000 / 2;
  return {
    ts,
    mid: price,
    bid: price * (1 - halfSpread),
    ask: price * (1 + halfSpread),
    last: price,
    volume: 1,
  };
}

export function generateChoppy(opts: BaseOpts & { bandPct: number }): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    const phase = (i / opts.ticks) * Math.PI * 4;
    const noise = (rng() - 0.5) * 2 * 0.001;
    const price = opts.basePrice * (1 + Math.sin(phase) * opts.bandPct + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}

export function generateFakeout(opts: BaseOpts & {
  pumpPct: number;
  reversePct: number;
  pumpStart: number;
  pumpEnd: number;
}): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    let pct = 0;
    if (i < opts.pumpStart) {
      pct = 0;
    } else if (i <= opts.pumpEnd) {
      const t = (i - opts.pumpStart) / (opts.pumpEnd - opts.pumpStart);
      pct = t * opts.pumpPct;
    } else {
      const t = (i - opts.pumpEnd) / (opts.ticks - 1 - opts.pumpEnd);
      pct = opts.pumpPct + (opts.reversePct - opts.pumpPct) * t;
    }
    const noise = (rng() - 0.5) * 2 * 0.001;
    const price = opts.basePrice * (1 + pct + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}

export function generateLiquidityCrisis(opts: BaseOpts & { driftPct: number }): Tick[] {
  const rng = makeRng(opts.seed);
  const ticks: Tick[] = [];
  const startMs = new Date(opts.startTs).getTime();
  for (let i = 0; i < opts.ticks; i++) {
    const t = i / (opts.ticks - 1);
    const drift = t * opts.driftPct;
    const noise = (rng() - 0.5) * 2 * 0.0015;
    const price = opts.basePrice * (1 + drift + noise);
    ticks.push(makeTick(new Date(startMs + i * opts.tickIntervalMs).toISOString(), price));
  }
  return ticks;
}
