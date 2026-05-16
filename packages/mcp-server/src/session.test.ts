// packages/mcp-server/src/session.test.ts
import { describe, it, expect, vi } from "vitest";
import { SessionRegistry } from "./session";
import type { EngineSession } from "./engine-adapter";

function mockEngine(): EngineSession {
  return {
    isDone: vi.fn(() => false),
    currentObservation: vi.fn(() => ({ tickId: 1 } as any)),
    applyAction: vi.fn(() => ({})),
    advance: vi.fn(),
    finalize: vi.fn(() => ({ scorecard: { sortino: 0 } as any, traceJsonl: "" })),
  } as unknown as EngineSession;
}

describe("SessionRegistry", () => {
  it("creates and retrieves a session", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ network: "galileo", tokenId: 42n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    const sess = reg.get(runId);
    expect(sess.tokenId).toBe(42n);
    expect(sess.expectedNonce).toBe(0n);
    expect(sess.status).toBe("active");
  });

  it("rejects nonce reuse and gaps", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ network: "galileo", tokenId: 42n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    expect(reg.checkAndAdvanceNonce(runId, 1n)).toBe(true);
    expect(reg.checkAndAdvanceNonce(runId, 1n)).toBe(false); // duplicate
    expect(reg.checkAndAdvanceNonce(runId, 3n)).toBe(false); // gap
    expect(reg.checkAndAdvanceNonce(runId, 2n)).toBe(true);
  });

  it("removes session on close", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ network: "galileo", tokenId: 1n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    reg.close(runId);
    expect(() => reg.get(runId)).toThrow();
  });

  it("listForToken filters by tokenId", () => {
    const reg = new SessionRegistry();
    const r1 = reg.create({ network: "galileo", tokenId: 7n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    const r2 = reg.create({ network: "galileo", tokenId: 7n, signer: "0xCD", scenarioId: "s2", engine: mockEngine() });
    const r3 = reg.create({ network: "galileo", tokenId: 8n, signer: "0xEF", scenarioId: "s", engine: mockEngine() });
    expect(reg.listForToken(7n).map((s) => s.runId).sort()).toEqual([r1, r2].sort());
    expect(reg.listForToken(8n).map((s) => s.runId)).toEqual([r3]);
    expect(reg.listForToken(99n)).toEqual([]);
  });

  it("emits events from per-session emitter", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ network: "galileo", tokenId: 1n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    const sess = reg.get(runId);
    const seen: string[] = [];
    sess.events.on("tick", (ev) => seen.push(`tick:${ev.id}`));
    sess.events.emit("tick", { id: 5 });
    expect(seen).toEqual(["tick:5"]);
  });
});
