import { z } from "zod";

const NewsInput = z.object({
  at: z.string().datetime(),
  headline: z.string(),
  source: z.string(),
  body: z.string().optional(),
});

const Common = z.object({
  id: z.string().min(1).max(31),
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  description: z.string(),
  tests: z.string(),
  news: z.array(NewsInput),
  budgets: z.object({
    llm_completions_per_tick: z.number().int().positive(),
    tool_calls_per_tick: z.number().int().positive(),
  }),
  slippage: z.object({
    base_bps: z.number().nonnegative(),
    impact_coeff: z.number().nonnegative(),
  }),
  starting: z.object({
    cash_usd: z.number().positive(),
    position: z.number(),
  }),
  asset: z.string().min(1),
  tick_interval_ms: z.number().int().positive(),
});

const Historical = Common.extend({
  kind: z.literal("historical"),
  fetch: z.object({
    provider: z.literal("binance"),
    symbol: z.string(),
    interval: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

const Synthetic = Common.extend({
  kind: z.literal("synthetic"),
  generator: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("choppy"), basePrice: z.number(), bandPct: z.number(), seed: z.number().int() }),
    z.object({ kind: z.literal("fakeout"), basePrice: z.number(), pumpPct: z.number(), reversePct: z.number(), pumpStart: z.number().int(), pumpEnd: z.number().int(), seed: z.number().int() }),
    z.object({ kind: z.literal("liquidity-crisis"), basePrice: z.number(), driftPct: z.number(), seed: z.number().int() }),
  ]),
  ticks: z.number().int().positive(),
  start_ts: z.string().datetime(),
});

export const RecipeSchema = z.discriminatedUnion("kind", [Historical, Synthetic]);
export type Recipe = z.infer<typeof RecipeSchema>;
