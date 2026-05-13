import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { loadManifest, type Manifest } from "@crucible/core";

const WORKSPACE_ROOT = process.env["INIT_CWD"] ?? path.resolve(process.cwd(), "..", "..");
const SCENARIOS_DIR = path.join(WORKSPACE_ROOT, "scenarios");

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
  previewPoints: number[];        // ~60 downsampled mid-prices
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
  newsIndexes: number[];         // indexes into previewPoints where news landed
}

function downsample(values: number[], targetLen: number): number[] {
  if (values.length <= targetLen) return values.slice();
  const step = values.length / targetLen;
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    out.push(values[Math.floor(i * step)]!);
  }
  return out;
}

async function readTicksMids(dir: string): Promise<number[]> {
  const raw = await readFile(path.join(dir, "ticks.jsonl"), "utf8");
  return raw.split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { mid: number }).mid);
}

async function readNewsTimestamps(dir: string): Promise<string[]> {
  try {
    const raw = await readFile(path.join(dir, "news.jsonl"), "utf8");
    return raw.split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { ts: string }).ts);
  } catch {
    return [];
  }
}

export async function listScenarios(): Promise<ScenarioListEntry[]> {
  const entries = await readdir(SCENARIOS_DIR);
  const out: ScenarioListEntry[] = [];
  for (const id of entries) {
    const dir = path.join(SCENARIOS_DIR, id);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
      const manifest: Manifest = await loadManifest(path.join(dir, "manifest.yaml"));
      const mids = await readTicksMids(dir);
      const preview = downsample(mids, 60);
      const netMovePct = mids.length > 1 ? (mids[mids.length - 1]! - mids[0]!) / mids[0]! : 0;
      out.push({
        id: manifest.id,
        title: manifest.title,
        asset: manifest.asset,
        kind: (manifest.kind ?? "synthetic") as "historical" | "synthetic",
        difficulty: manifest.difficulty,
        tags: manifest.tags,
        durationTicks: manifest.duration_ticks,
        tickIntervalMs: manifest.tick_interval_ms,
        windowStart: manifest.window.start,
        windowEnd: manifest.window.end,
        previewPoints: preview,
        netMovePct,
      });
    } catch {
      // skip directories that don't look like scenarios
    }
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export async function getScenarioDetail(id: string): Promise<ScenarioDetail | null> {
  const dir = path.join(SCENARIOS_DIR, id);
  try {
    const manifest: Manifest = await loadManifest(path.join(dir, "manifest.yaml"));
    const mids = await readTicksMids(dir);
    const preview = downsample(mids, 60);
    const netMovePct = mids.length > 1 ? (mids[mids.length - 1]! - mids[0]!) / mids[0]! : 0;
    const newsTs = await readNewsTimestamps(dir);

    const tickTimes = (await readFile(path.join(dir, "ticks.jsonl"), "utf8"))
      .split("\n").filter(Boolean)
      .map((l) => new Date((JSON.parse(l) as { ts: string }).ts).getTime());
    const firstT = tickTimes[0] ?? 0;
    const lastT = tickTimes[tickTimes.length - 1] ?? firstT;
    const span = Math.max(1, lastT - firstT);
    const newsIndexes = newsTs.map((ts) => {
      const ratio = (new Date(ts).getTime() - firstT) / span;
      return Math.max(0, Math.min(preview.length - 1, Math.round(ratio * (preview.length - 1))));
    });

    return {
      id: manifest.id,
      title: manifest.title,
      asset: manifest.asset,
      kind: (manifest.kind ?? "synthetic") as "historical" | "synthetic",
      difficulty: manifest.difficulty,
      tags: manifest.tags,
      durationTicks: manifest.duration_ticks,
      tickIntervalMs: manifest.tick_interval_ms,
      windowStart: manifest.window.start,
      windowEnd: manifest.window.end,
      previewPoints: preview,
      netMovePct,
      description: manifest.description,
      tests: manifest.tests,
      startingCashUsd: manifest.starting_cash_usd,
      startingPosition: manifest.starting_position,
      contentHash: manifest.content_hash,
      dataSource: manifest.data_source,
      newsSource: manifest.news_source,
      newsIndexes,
    };
  } catch {
    return null;
  }
}
