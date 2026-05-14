import { describe, it, expect } from "vitest";
import { ScenarioEngine, type StepFn } from "../src/engine.js";
import { loadScenario } from "../src/scenario.js";
import { MemoryRecorder } from "../src/recorder.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures/mini-scenario");

describe("ScenarioEngine", () => {
  it("runs all ticks with a no-op agent and produces one trace entry per tick", async () => {
    const scenario = await loadScenario(FIXTURE);
    const recorder = new MemoryRecorder();
    const engine = new ScenarioEngine(scenario, recorder);
    const noop: StepFn = async () => ({ completions: [], toolCalls: [] });

    const result = await engine.run(noop);

    expect(recorder.entries()).toHaveLength(scenario.manifest.duration_ticks);
    expect(result.scorecard.totalReturnPct).toBe(0);
  });

  it("settles a market_buy then closes for a profit", async () => {
    const scenario = await loadScenario(FIXTURE);
    const recorder = new MemoryRecorder();
    const engine = new ScenarioEngine(scenario, recorder);
    const handle = engine.getEngineHandle();

    let bought = false;
    let sold = false;
    const agent: StepFn = async (snapshot) => {
      if (!bought && snapshot.tick === 0) {
        handle.placeMarketOrder("buy", 1);
        bought = true;
      } else if (bought && !sold && snapshot.tick === 4) {
        handle.placeMarketOrder("sell", 1);
        sold = true;
      }
      return { completions: [], toolCalls: [] };
    };

    const result = await engine.run(agent);
    expect(result.scorecard.totalReturnPct).toBeGreaterThan(0);
  });
});
