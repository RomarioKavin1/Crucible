import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { DEFAULT_SCENARIOS_DIR, WORKSPACE_ROOT } from "@/lib/server/run-store";

interface ScenarioListing {
  dir: string; // path relative to workspace root, e.g. "scenarios/synthetic-eth-flash-crash"
  id: string;
  title: string;
  asset?: string;
  ticks?: number;
  startingCash?: number;
}

export async function GET() {
  const items: ScenarioListing[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(DEFAULT_SCENARIOS_DIR);
  } catch {
    return NextResponse.json({ scenarios: [] });
  }
  for (const name of entries) {
    const dir = path.join(DEFAULT_SCENARIOS_DIR, name);
    try {
      const raw = await readFile(path.join(dir, "manifest.yaml"), "utf8");
      const m = yaml.load(raw) as {
        id?: string;
        title?: string;
        asset?: string;
        duration_ticks?: number;
        starting_cash_usd?: number;
      };
      items.push({
        dir: path.relative(WORKSPACE_ROOT, dir),
        id: m.id ?? name,
        title: m.title ?? name,
        asset: m.asset,
        ticks: m.duration_ticks,
        startingCash: m.starting_cash_usd,
      });
    } catch {
      // ignore unreadable
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json({ scenarios: items });
}
