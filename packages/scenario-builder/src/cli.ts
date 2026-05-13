#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { RecipeSchema, type Recipe } from "./recipe-schema";
import { fetchBinanceKlines } from "./fetch-binance";
import { klinesToTicks } from "./klines-to-ticks";
import { generateChoppy, generateFakeout, generateLiquidityCrisis } from "./synthetic";
import { mapInputNews } from "./news-mapper";
import { writeBundle, computeContentHash } from "./build-bundle";
import type { Tick } from "@crucible/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const INPUTS_DIR = path.join(__dirname, "..", "inputs");
const OUT_DIR = path.join(REPO_ROOT, "scenarios");

async function buildRecipe(recipe: Recipe): Promise<void> {
  console.log(`▶ Building ${recipe.id} (${recipe.kind})...`);

  let ticks: Tick[];
  let dataSourceField: Record<string, unknown> = {};
  if (recipe.kind === "historical") {
    const rows = await fetchBinanceKlines({
      symbol: recipe.fetch.symbol,
      interval: recipe.fetch.interval,
      startMs: new Date(recipe.fetch.start).getTime(),
      endMs: new Date(recipe.fetch.end).getTime(),
    });
    const bpsSpread = recipe.slippage.base_bps;
    ticks = klinesToTicks(rows, bpsSpread);
    dataSourceField = {
      data_source: {
        provider: recipe.fetch.provider,
        symbol: recipe.fetch.symbol,
        interval: recipe.fetch.interval,
        fetched_at: new Date().toISOString(),
      },
      news_source: "hand-curated",
    };
  } else {
    const opts = { tickIntervalMs: recipe.tick_interval_ms, startTs: recipe.start_ts, ticks: recipe.ticks, seed: recipe.generator.seed, basePrice: recipe.generator.basePrice };
    if (recipe.generator.kind === "choppy") {
      ticks = generateChoppy({ ...opts, bandPct: recipe.generator.bandPct });
    } else if (recipe.generator.kind === "fakeout") {
      ticks = generateFakeout({ ...opts, pumpPct: recipe.generator.pumpPct, reversePct: recipe.generator.reversePct, pumpStart: recipe.generator.pumpStart, pumpEnd: recipe.generator.pumpEnd });
    } else {
      ticks = generateLiquidityCrisis({ ...opts, driftPct: recipe.generator.driftPct });
    }
  }

  const news = mapInputNews(recipe.news, ticks);
  const contentHash = computeContentHash(ticks, news);

  const manifest = {
    id: recipe.id,
    title: recipe.title,
    asset: recipe.asset,
    window: {
      start: ticks[0]!.ts,
      end: ticks[ticks.length - 1]!.ts,
    },
    tick_interval_ms: recipe.tick_interval_ms,
    duration_ticks: ticks.length,
    starting_cash_usd: recipe.starting.cash_usd,
    starting_position: recipe.starting.position,
    scoring: { primary: "sortino_ratio", secondary: ["max_drawdown_pct", "total_return_pct", "win_rate"] },
    slippage: recipe.slippage,
    content_hash: contentHash,
    visibility: "public",
    budgets: {
      llm_completions_per_tick: recipe.budgets.llm_completions_per_tick,
      tool_calls_per_tick: recipe.budgets.tool_calls_per_tick,
      wall_clock_ms_per_tick: 30000,
    },
    kind: recipe.kind,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    description: recipe.description,
    tests: recipe.tests,
    ...dataSourceField,
  };

  await writeBundle(path.join(OUT_DIR, recipe.id), { manifest, ticks, news });
  console.log(`  ✓ ${ticks.length} ticks, ${news.length} news → scenarios/${recipe.id}/`);
  console.log(`  content_hash: ${contentHash}`);
}

async function main() {
  const arg = process.argv[2];
  const entries = await readdir(INPUTS_DIR);
  const yamlFiles = entries.filter((f) => f.endsWith(".yaml"));
  const targets = arg ? yamlFiles.filter((f) => f.includes(arg)) : yamlFiles;
  if (targets.length === 0) {
    console.error(`No recipes matching '${arg ?? "*"}'.`);
    process.exit(1);
  }
  for (const file of targets) {
    const raw = await readFile(path.join(INPUTS_DIR, file), "utf8");
    const parsed = RecipeSchema.parse(yaml.load(raw));
    await buildRecipe(parsed);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
