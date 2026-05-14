import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { startRunBackground } from "@/lib/server/run-orchestrator";
import { listRunsFromDisk, DEFAULT_RUNS_DIR, WORKSPACE_ROOT } from "@/lib/server/run-store";

export async function GET() {
  const runs = await listRunsFromDisk(DEFAULT_RUNS_DIR);
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const { scenarioDir, recipePath } = await req.json() as { scenarioDir: string; recipePath: string };
  const runId = await startRunBackground({
    scenarioDir: path.isAbsolute(scenarioDir) ? scenarioDir : path.resolve(WORKSPACE_ROOT, scenarioDir),
    recipePath: path.isAbsolute(recipePath) ? recipePath : path.resolve(WORKSPACE_ROOT, recipePath),
    outDir: DEFAULT_RUNS_DIR,
  });
  return NextResponse.json({ runId });
}
