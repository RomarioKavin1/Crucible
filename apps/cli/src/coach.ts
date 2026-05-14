import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runCoach } from "@crucible/coach";

export interface CoachOpts {
  runDir: string;
  systemPrompt?: string;
}

function resolveUserPath(p: string): string {
  if (path.isAbsolute(p)) return p;
  const base = process.env["INIT_CWD"] ?? process.cwd();
  return path.resolve(base, p);
}

export async function coachCommand(opts: CoachOpts): Promise<void> {
  const runDir = resolveUserPath(opts.runDir);
  const { markdown } = await runCoach({ runDir, systemPromptForContext: opts.systemPrompt });
  const outPath = path.join(runDir, "coach-report.md");
  await writeFile(outPath, markdown);
  console.log(`Coach report written to: ${outPath}`);
  console.log("");
  console.log(markdown.split("\n").slice(0, 30).join("\n"));
  console.log("...");
}
