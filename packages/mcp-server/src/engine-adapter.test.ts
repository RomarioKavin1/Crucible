// packages/mcp-server/src/engine-adapter.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EngineSession } from "./engine-adapter";

function fixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "scen-"));
  writeFileSync(
    path.join(dir, "manifest.yaml"),
    `id: tiny
title: Tiny Test Scenario
asset: ETH-USDC
window:
  start: "2026-01-01T00:00:00Z"
  end: "2026-01-01T00:00:02Z"
tick_interval_ms: 1000
duration_ticks: 3
starting_cash_usd: 10000
starting_position: 0
scoring:
  primary: sortino_ratio
  secondary: []
slippage:
  base_bps: 1
  impact_coeff: 0
content_hash: "0000000000000000000000000000000000000000000000000000000000000000"
visibility: public
budgets:
  llm_completions_per_tick: 1
  tool_calls_per_tick: 4
  wall_clock_ms_per_tick: 30000
`
  );
  // Three ticks with bid/ask/last/mid/volume
  const tick = (i: number, last: number) =>
    JSON.stringify({
      ts: `2026-01-01T00:00:0${i}Z`,
      last,
      bid: last - 0.05,
      ask: last + 0.05,
      mid: last,
      volume: 100,
    });
  writeFileSync(
    path.join(dir, "ticks.jsonl"),
    [tick(0, 100), tick(1, 101), tick(2, 102)].join("\n") + "\n"
  );
  writeFileSync(path.join(dir, "news.jsonl"), "");
  writeFileSync(
    path.join(dir, "starting_state.json"),
    JSON.stringify({ cash: 10000, position: 0 })
  );
  return dir;
}

describe("EngineSession", () => {
  it("walks through ticks until done", async () => {
    const dir = fixture();
    const sess = await EngineSession.init({ scenarioDir: dir });
    expect(sess.isDone()).toBe(false);

    const obs1 = sess.currentObservation();
    expect(obs1.tickId).toBe(0);
    expect(obs1.price).toBe(100);

    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "watch" });
    sess.advance();
    expect(sess.currentObservation().tickId).toBe(1);

    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "" });
    sess.advance();
    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "" });
    sess.advance();

    expect(sess.isDone()).toBe(true);
    const result = sess.finalize();
    expect(result.scorecard).toBeDefined();
    expect(typeof result.traceJsonl).toBe("string");
    expect(result.traceJsonl.split("\n").filter(Boolean).length).toBe(3);
  });

  it("market_buy applies fill and updates position", async () => {
    const dir = fixture();
    const sess = await EngineSession.init({ scenarioDir: dir });
    const out = sess.applyAction({
      kind: "market_buy",
      qty: BigInt(1e18),
      reasoning: "test",
    }); // 1 unit (qty in 1e18 units)
    expect(out.fill).toBeDefined();
    expect(out.fill!.qty).toBe(1);
    sess.advance();
    const obs2 = sess.currentObservation();
    expect(obs2.position).toBe(1);
    expect(obs2.cash).toBeLessThan(10000);
  });
});
