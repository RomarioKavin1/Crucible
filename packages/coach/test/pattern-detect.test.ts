import { describe, it, expect } from "vitest";
import { detectPatterns } from "../src/pattern-detect.js";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("detectPatterns", () => {
  it("detects PANIC_SELLER on the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    // The sample run sells 1 ETH during a sharp drop after Trump news.
    // Sample only has 1 sell, so detection ratio = 1/1 = 1.0 (above 0.4 threshold).
    const patterns = detectPatterns(run.entries);
    const ids = patterns.map((p) => p.patternId);
    expect(ids).toContain("PANIC_SELLER");
  });

  it("detects NEWS_BLIND on the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    // Sample never calls get_news_feed despite news arriving at tick 2.
    const patterns = detectPatterns(run.entries);
    const ids = patterns.map((p) => p.patternId);
    expect(ids).toContain("NEWS_BLIND");
  });
});
