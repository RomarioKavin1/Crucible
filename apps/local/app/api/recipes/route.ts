import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { DEFAULT_RECIPES_DIR, WORKSPACE_ROOT } from "@/lib/server/run-store";

interface RecipeListing {
  path: string; // relative to workspace root
  name: string;
  provider?: string;
  modelId?: string;
}

export async function GET() {
  const items: RecipeListing[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(DEFAULT_RECIPES_DIR);
  } catch {
    return NextResponse.json({ recipes: [] });
  }
  for (const name of entries) {
    if (!name.endsWith(".yaml")) continue;
    const full = path.join(DEFAULT_RECIPES_DIR, name);
    try {
      const raw = await readFile(full, "utf8");
      const r = yaml.load(raw) as {
        name?: string;
        model?: { provider?: string; id?: string };
      };
      items.push({
        path: path.relative(WORKSPACE_ROOT, full),
        name: r.name ?? name.replace(/\.yaml$/, ""),
        provider: r.model?.provider,
        modelId: r.model?.id,
      });
    } catch {
      // ignore unreadable
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ recipes: items });
}
