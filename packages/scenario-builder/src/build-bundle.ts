import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { Tick, NewsItem } from "@crucible/core";

/** SHA-256 over canonical JSON of ticks + news. 0x-prefixed hex. */
export function computeContentHash(ticks: Tick[], news: NewsItem[]): string {
  const canonical = JSON.stringify({ ticks, news });
  const h = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `0x${h}`;
}

export interface WriteBundleInput {
  manifest: Record<string, unknown>;
  ticks: Tick[];
  news: NewsItem[];
}

export async function writeBundle(dir: string, input: WriteBundleInput): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "manifest.yaml"),
    yaml.dump(input.manifest, { lineWidth: -1, sortKeys: false }),
    "utf8",
  );
  await writeFile(
    path.join(dir, "ticks.jsonl"),
    input.ticks.map((t) => JSON.stringify(t)).join("\n") + "\n",
    "utf8",
  );
  await writeFile(
    path.join(dir, "news.jsonl"),
    input.news.map((n) => JSON.stringify(n)).join("\n") + (input.news.length ? "\n" : ""),
    "utf8",
  );
  // starting_state.json is read separately by the scenario loader; mirror manifest values.
  const cash = input.manifest["starting_cash_usd"];
  const position = input.manifest["starting_position"];
  await writeFile(
    path.join(dir, "starting_state.json"),
    JSON.stringify({ cash, position }) + "\n",
    "utf8",
  );
}
