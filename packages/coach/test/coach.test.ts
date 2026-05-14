import { describe, it, expect } from "vitest";
import { runCoach } from "../src/coach.js";
import type { OgLlmClient } from "../src/og-llm-client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MockLlmClient {
  async complete(_sys: string, _user: string, opts?: { responseFormat?: "text" | "json_object" }): Promise<string> {
    if (opts?.responseFormat === "json_object") {
      if (_sys.includes("synthesizing")) {
        return JSON.stringify({
          suggestions: [{
            rank: 1, title: "Stop panic selling", impact: "high",
            rationale: "Detected panic seller pattern.",
            promptEditSuggestion: "Do not sell on drawdowns below 5%.",
            verificationStep: "Re-run scenario, expect win_rate > 0.5",
          }],
        });
      }
      return JSON.stringify({ critique: "Agent panic-sold on news.", recommendation: "Reassess thesis before selling." });
    }
    return "text response";
  }
}

describe("runCoach (mock LLM)", () => {
  it("produces a coach report end-to-end", async () => {
    const runDir = path.join(__dirname, "fixtures/sample-run");
    const { report, markdown } = await runCoach({
      runDir,
      llm: new MockLlmClient() as unknown as OgLlmClient,
    });
    expect(report.patternsDetected.map((p) => p.patternId)).toContain("PANIC_SELLER");
    expect(report.topSuggestions.length).toBeGreaterThan(0);
    expect(markdown).toContain("# Coach Report");
    expect(markdown).toContain("Stop panic selling");
  });
});
