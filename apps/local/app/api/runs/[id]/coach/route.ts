import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runCoach } from "@crucible/coach";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const runDir = path.resolve("./runs", params.id);
  const { report, markdown } = await runCoach({ runDir });
  await writeFile(path.join(runDir, "coach-report.md"), markdown);
  return NextResponse.json({ report, markdown });
}
