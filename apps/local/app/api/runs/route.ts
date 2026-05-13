import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { startRunBackground } from "@/lib/server/run-orchestrator";
import { listRunsFromDisk } from "@/lib/server/run-store";

export async function GET() {
  const runs = await listRunsFromDisk(path.resolve("./runs"));
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const { scenarioDir, recipePath } = await req.json() as { scenarioDir: string; recipePath: string };
  const runId = await startRunBackground({
    scenarioDir: path.resolve(scenarioDir),
    recipePath: path.resolve(recipePath),
    outDir: path.resolve("./runs"),
  });
  return NextResponse.json({ runId });
}
