import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadManifest, type Manifest } from "./manifest.js";
import type { Tick, NewsItem } from "./types.js";

export interface StartingState {
  cash: number;
  position: number;
}

export interface Scenario {
  manifest: Manifest;
  ticks: Tick[];
  news: NewsItem[];
  startingState: StartingState;
  bundleDir: string;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as T);
}

export async function loadScenario(bundleDir: string): Promise<Scenario> {
  const manifest = await loadManifest(path.join(bundleDir, "manifest.yaml"));
  const ticks = await readJsonl<Tick>(path.join(bundleDir, "ticks.jsonl"));
  const news = await readJsonl<NewsItem>(path.join(bundleDir, "news.jsonl"));
  const startingStateRaw = await readFile(
    path.join(bundleDir, "starting_state.json"),
    "utf8"
  );
  const startingState = JSON.parse(startingStateRaw) as StartingState;

  if (ticks.length !== manifest.duration_ticks) {
    throw new Error(
      `Scenario ${manifest.id}: manifest.duration_ticks=${manifest.duration_ticks} ` +
        `does not match ticks.jsonl row count=${ticks.length}`
    );
  }

  return { manifest, ticks, news, startingState, bundleDir };
}
