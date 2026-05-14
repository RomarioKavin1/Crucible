import { describe, it, expect } from "vitest";
import { loadScenario } from "../src/scenario.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures/mini-scenario");

describe("scenario loader", () => {
  it("loads manifest, ticks, news, starting state", async () => {
    const s = await loadScenario(FIXTURE);
    expect(s.manifest.id).toBe("mini");
    expect(s.ticks).toHaveLength(5);
    expect(s.ticks[0]?.mid).toBe(100);
    expect(s.ticks[4]?.mid).toBe(102);
    expect(s.news).toHaveLength(1);
    expect(s.news[0]?.headline).toBe("Test headline");
    expect(s.startingState.cash).toBe(1000);
    expect(s.startingState.position).toBe(0);
  });

  it.todo("throws if duration_ticks does not match ticks.jsonl row count");

  it("throws when news.jsonl is not in chronological order", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "crucible-bad-news-"));
    try {
      await cp(FIXTURE, tmp, { recursive: true });
      // Overwrite news.jsonl with two rows in reverse order
      const badNews =
        `{"ts":"2025-01-01T00:00:04Z","headline":"later","body":"","source":"t"}\n` +
        `{"ts":"2025-01-01T00:00:01Z","headline":"earlier","body":"","source":"t"}\n`;
      await writeFile(path.join(tmp, "news.jsonl"), badNews);
      await expect(loadScenario(tmp)).rejects.toThrow(/not in chronological order/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
