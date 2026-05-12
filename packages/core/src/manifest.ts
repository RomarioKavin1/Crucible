import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { z } from "zod";

export const ManifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  asset: z.string().min(1),
  window: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  tick_interval_ms: z.number().int().positive(),
  duration_ticks: z.number().int().positive(),
  starting_cash_usd: z.number().positive(),
  starting_position: z.number(),
  scoring: z.object({
    primary: z.enum(["sortino_ratio", "sharpe_ratio", "total_return_pct"]),
    secondary: z.array(z.string()),
  }),
  slippage: z.object({
    base_bps: z.number().nonnegative(),
    impact_coeff: z.number().nonnegative(),
  }),
  content_hash: z.string(),
  visibility: z.enum(["public", "held_out"]),
  budgets: z.object({
    llm_completions_per_tick: z.number().int().positive(),
    tool_calls_per_tick: z.number().int().positive(),
    wall_clock_ms_per_tick: z.number().int().positive(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export async function loadManifest(filePath: string): Promise<Manifest> {
  const raw = await readFile(filePath, "utf8");
  const parsed = yaml.load(raw);
  return ManifestSchema.parse(parsed);
}
