#!/usr/bin/env node
// Pre-generate apps/web/lib/scenarios-data.generated.json from the scenarios/
// directory so the web app can import it statically (webpack inlines it,
// no fs.readdir at runtime — works on Vercel without trace include juggling).
//
// Runs as a prebuild step. Reads from monorepo-root/scenarios/, writes to
// apps/web/lib/scenarios-data.generated.json.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try repo-root scenarios first (local dev + Vercel after install copy),
// then apps/web/scenarios (Vercel after install copy as a fallback location).
const CANDIDATES = [
  path.resolve(__dirname, "..", "..", "..", "scenarios"),
  path.resolve(__dirname, "..", "scenarios"),
];
const SCENARIOS_DIR = CANDIDATES.find((p) => existsSync(p));
const OUT_FILE = path.resolve(__dirname, "..", "lib", "scenarios-data.generated.json");

if (!SCENARIOS_DIR) {
  console.error("[scenarios-manifest] No scenarios/ directory found in any candidate location:");
  for (const c of CANDIDATES) console.error("  ·", c);
  console.error("[scenarios-manifest] Writing empty manifest so the build can proceed.");
  await writeFile(OUT_FILE, "[]\n", "utf8");
  process.exit(0);
}

console.log("[scenarios-manifest] Reading from:", SCENARIOS_DIR);

const out = [];
for (const id of await readdir(SCENARIOS_DIR)) {
  const dir = path.join(SCENARIOS_DIR, id);
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) continue;
    const manifestRaw = await readFile(path.join(dir, "manifest.yaml"), "utf8");
    const manifest = yaml.load(manifestRaw);

    const ticksRaw = await readFile(path.join(dir, "ticks.jsonl"), "utf8");
    const mids = ticksRaw.split("\n").filter(Boolean).map((l) => JSON.parse(l).mid);

    let newsTs = [];
    try {
      const newsRaw = await readFile(path.join(dir, "news.jsonl"), "utf8");
      newsTs = newsRaw.split("\n").filter(Boolean).map((l) => JSON.parse(l).ts);
    } catch {/* news.jsonl optional */}

    const tickTimes = ticksRaw.split("\n").filter(Boolean).map((l) => new Date(JSON.parse(l).ts).getTime());

    out.push({ id, manifest, mids, newsTs, tickTimes });
  } catch (err) {
    console.warn(`[scenarios-manifest] skipping ${id}: ${err.message}`);
  }
}

out.sort((a, b) => (a.manifest?.title ?? a.id).localeCompare(b.manifest?.title ?? b.id));

await writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
console.log(`[scenarios-manifest] Wrote ${out.length} scenarios to ${OUT_FILE}`);
