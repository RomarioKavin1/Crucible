// packages/mcp-server/src/tools/list-scenarios.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const ScenarioSummary = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().int().min(1).max(5),
  kind: z.enum(["historical", "synthetic"]),
  totalTicks: z.number().int().positive(),
  asset: z.string(),
  description: z.string(),
});
export type ScenarioSummary = z.infer<typeof ScenarioSummary>;

export async function listScenarios(scenariosDir: string): Promise<ScenarioSummary[]> {
  const entries = await readdir(scenariosDir, { withFileTypes: true });
  const summaries: ScenarioSummary[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(scenariosDir, e.name, "manifest.yaml");
    try {
      const raw = await readFile(manifestPath, "utf8");
      const m = yaml.load(raw) as any;
      summaries.push(ScenarioSummary.parse({
        id: m.id ?? e.name,
        name: m.name ?? m.title ?? m.id ?? e.name,
        difficulty: m.difficulty ?? 3,
        kind: m.kind ?? "synthetic",
        // Real manifest field is `duration_ticks` (not `total_ticks`); accept either.
        totalTicks: m.total_ticks ?? m.duration_ticks ?? 100,
        asset: m.asset ?? "ETH-USDC",
        description: m.description ?? "",
      }));
    } catch {
      // skip directories without a valid manifest
    }
  }
  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}
