import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const ENV_LINE = /^([A-Z_][A-Z0-9_]*)=(.*)$/;

function parseEnvFile(p: string): Record<string, string> {
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = ENV_LINE.exec(trimmed);
    if (m) out[m[1]!] = m[2]!.replace(/^["'](.*)["']$/, "$1").trim();
  }
  return out;
}

/** Load env files in precedence: ~/.crucible/config.env → ./crucible.env → process.env. */
export function loadEnvFiles(): void {
  const sources = [
    path.join(homedir(), ".crucible", "config.env"),
    path.resolve(process.cwd(), "crucible.env"),
  ];
  for (const p of sources) {
    const exists = existsSync(p);
    const label = exists ? "loaded" : "skipped, not present";
    console.log(`▸ Loading env: ${p} (${label})`);
    if (!exists) continue;
    const vars = parseEnvFile(p);
    let count = 0;
    for (const [k, v] of Object.entries(vars)) {
      // Don't overwrite if already in process.env (shell beats file)
      if (process.env[k] === undefined) {
        process.env[k] = v;
        count++;
      }
    }
    if (exists) {
      // re-print with count
      process.stdout.write(`\x1b[1A\x1b[2K▸ Loading env: ${p} (loaded ${count} keys)\n`);
    }
  }
}
