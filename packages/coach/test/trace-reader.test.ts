import { describe, it, expect } from "vitest";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures/sample-run");

describe("loadRun", () => {
  it("loads trace.jsonl and scorecard.json from a run directory", async () => {
    const run = await loadRun(FIXTURE);
    expect(run.entries).toHaveLength(5);
    expect(run.entries[0]?.tick).toBe(0);
    expect(run.scorecard.scorecard.sortino).toBeCloseTo(0.31);
    expect(run.scenarioId).toBe("synthetic-eth-flash-crash");
    expect(run.recipeName).toBe("baseline-claude");
  });
});
