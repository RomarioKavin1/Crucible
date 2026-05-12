import { describe, it, expect } from "vitest";
import { JsonlFileRecorder, ScenarioEngine, loadScenario } from "@crucible/core";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("end-to-end smoke (no LLM)", () => {
  it("runs the synthetic-eth-flash-crash scenario with a no-op agent and writes a trace", async () => {
    const scenarioDir = path.resolve(__dirname, "../../../scenarios/synthetic-eth-flash-crash");
    const scenario = await loadScenario(scenarioDir);
    const tmp = await mkdtemp(path.join(tmpdir(), "crucible-smoke-"));
    const tracePath = path.join(tmp, "trace.jsonl");
    const recorder = new JsonlFileRecorder(tracePath);

    const engine = new ScenarioEngine(scenario, recorder);
    const result = await engine.run(async () => ({ completions: [], toolCalls: [] }));

    expect(result.ticksProcessed).toBe(100);
    const text = await readFile(tracePath, "utf8");
    expect(text.split("\n").filter((l) => l.length > 0)).toHaveLength(100);
    await rm(tmp, { recursive: true, force: true });
  });
});
