import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JsonlFileRecorder, MemoryRecorder } from "../src/recorder.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TraceEntry } from "../src/types.js";

const sampleEntry = (tick: number): TraceEntry => ({
  tick,
  ts: `2025-01-01T00:00:0${tick}Z`,
  market: { ts: `2025-01-01T00:00:0${tick}Z`, mid: 100, bid: 99.9, ask: 100.1, last: 100, volume: 1 },
  newsSeen: [],
  agent: { completions: [], toolCalls: [] },
  fills: [],
  portfolio: { cash: 1000, position: 0, realizedPnl: 0, unrealizedPnl: 0, highWaterEquity: 1000, drawdownPct: 0 },
});

describe("MemoryRecorder", () => {
  it("collects appended entries in order", async () => {
    const r = new MemoryRecorder();
    await r.append(sampleEntry(1));
    await r.append(sampleEntry(2));
    expect(r.entries()).toHaveLength(2);
    expect(r.entries()[1]?.tick).toBe(2);
  });
});

describe("JsonlFileRecorder", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "crucible-rec-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes one JSON line per appended entry", async () => {
    const file = path.join(dir, "trace.jsonl");
    const r = new JsonlFileRecorder(file);
    await r.append(sampleEntry(1));
    await r.append(sampleEntry(2));
    await r.close();
    const contents = await readFile(file, "utf8");
    const lines = contents.trim().split("\n");
    expect(lines).toHaveLength(2);
    const e0 = JSON.parse(lines[0]!) as TraceEntry;
    expect(e0.tick).toBe(1);
  });
});
