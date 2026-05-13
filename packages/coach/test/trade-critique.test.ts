import { describe, it, expect } from "vitest";
import { computeTradeCritiques } from "../src/trade-critique.js";
import { loadRun } from "../src/trace-reader.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("computeTradeCritiques", () => {
  it("produces counterfactual hold analysis for the sample run", async () => {
    const run = await loadRun(path.join(__dirname, "fixtures/sample-run"));
    const critiques = computeTradeCritiques(run.entries);
    expect(critiques).toHaveLength(2);

    const buyCritique = critiques[0]!;
    expect(buyCritique.side).toBe("buy");
    expect(buyCritique.tick).toBe(0);

    const sellCritique = critiques[1]!;
    expect(sellCritique.side).toBe("sell");
    expect(sellCritique.tick).toBe(2);
    // Hold-from-sell-tick to end: would have been at price 3520 vs sell at 3449.66
    // pnlIfHeld for a sold long: opportunity cost = (endPrice - sellPrice) * qty
    expect(sellCritique.counterfactualHold.pnlIfHeld).toBeGreaterThan(50);
  });
});
