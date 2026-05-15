// Scenario list/detail accessors. All data is pre-baked into
// scenarios-data.generated.json by scripts/build-scenarios-manifest.mjs at
// prebuild time. Webpack inlines the JSON, so this module works on Vercel
// without any runtime fs.readdir/readFile calls (which would fail because
// monorepo-external files aren't shipped in serverless function bundles).

import { keccak256, toBytes } from "viem";
import data from "./scenarios-data.generated.json";

export interface ScenarioListEntry {
  id: string;
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  difficulty?: number;
  tags?: string[];
  durationTicks: number;
  tickIntervalMs: number;
  windowStart: string;
  windowEnd: string;
  previewPoints: number[];
  netMovePct: number;
}

export interface ScenarioDetail extends ScenarioListEntry {
  description?: string;
  tests?: string;
  startingCashUsd: number;
  startingPosition: number;
  contentHash: string;
  dataSource?: { provider: string; symbol: string; interval: string; fetched_at: string };
  newsSource?: string;
  newsIndexes: number[];
}

interface RawEntry {
  id: string;
  manifest: any;
  mids: number[];
  newsTs: string[];
  tickTimes: number[];
}

const RAW = data as unknown as RawEntry[];

function downsample(values: number[], targetLen: number): number[] {
  if (values.length <= targetLen) return values.slice();
  const step = values.length / targetLen;
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) out.push(values[Math.floor(i * step)]!);
  return out;
}

function toListEntry(e: RawEntry): ScenarioListEntry {
  const m = e.manifest;
  const preview = downsample(e.mids, 60);
  const netMovePct = e.mids.length > 1 ? (e.mids[e.mids.length - 1]! - e.mids[0]!) / e.mids[0]! : 0;
  return {
    id: m.id ?? e.id,
    title: m.title ?? m.name ?? e.id,
    asset: m.asset,
    kind: (m.kind ?? "synthetic") as "historical" | "synthetic",
    difficulty: m.difficulty,
    tags: m.tags,
    durationTicks: m.total_ticks ?? m.duration_ticks ?? e.mids.length,
    tickIntervalMs: m.tick_interval_ms,
    windowStart: m.window?.start,
    windowEnd: m.window?.end,
    previewPoints: preview,
    netMovePct,
  };
}

export async function listScenarios(): Promise<ScenarioListEntry[]> {
  return RAW.map(toListEntry).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getScenarioDetail(id: string): Promise<ScenarioDetail | null> {
  const e = RAW.find((x) => x.id === id);
  if (!e) return null;
  const base = toListEntry(e);
  const m = e.manifest;
  const preview = base.previewPoints;

  const firstT = e.tickTimes[0] ?? 0;
  const lastT = e.tickTimes[e.tickTimes.length - 1] ?? firstT;
  const span = Math.max(1, lastT - firstT);
  const newsIndexes = e.newsTs.map((ts) => {
    const ratio = (new Date(ts).getTime() - firstT) / span;
    return Math.max(0, Math.min(preview.length - 1, Math.round(ratio * (preview.length - 1))));
  });

  return {
    ...base,
    description: m.description,
    tests: m.tests,
    startingCashUsd: m.starting_cash_usd,
    startingPosition: m.starting_position,
    contentHash: m.content_hash,
    dataSource: m.data_source,
    newsSource: m.news_source,
    newsIndexes,
  };
}

export function buildScenarioHashMap(scenarioIds: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const id of scenarioIds) m.set(keccak256(toBytes(id)).toLowerCase(), id);
  return m;
}

export async function decodeScenarioHash(hash: string): Promise<string | null> {
  const list = await listScenarios();
  return buildScenarioHashMap(list.map((s) => s.id)).get(hash.toLowerCase()) ?? null;
}
