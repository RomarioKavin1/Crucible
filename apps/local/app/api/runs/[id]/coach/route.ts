import { NextResponse } from "next/server";
import { DEFAULT_RUNS_DIR } from "@/lib/server/run-store";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runCoach } from "@crucible/coach";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const runDir = path.resolve(DEFAULT_RUNS_DIR, params.id);
  const { report, markdown } = await runCoach({ runDir });
  await writeFile(path.join(runDir, "coach-report.md"), markdown);
  return NextResponse.json({ report, markdown });
}
