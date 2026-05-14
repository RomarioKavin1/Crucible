// packages/mcp-server/src/persistence.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PersistenceStore } from "./persistence";

let tmpDirs: string[] = [];
afterEach(() => { tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true })); tmpDirs = []; });

function dbPath(): string {
  const d = mkdtempSync(path.join(tmpdir(), "ps-"));
  tmpDirs.push(d);
  return path.join(d, "test.sqlite");
}

describe("PersistenceStore", () => {
  it("upserts and reads back active sessions", () => {
    const s = new PersistenceStore({ path: dbPath() });
    s.upsertSession({
      runId: "0xabc", tokenId: "42", signer: "0xAB", scenarioId: "tiny",
      status: "active", expectedNonce: "0", createdAt: 1, lastTickAt: 1,
    });
    const active = s.loadActiveSessions();
    expect(active).toHaveLength(1);
    expect(active[0]!.runId).toBe("0xabc");
    expect(active[0]!.tokenId).toBe("42");
    s.close();
  });

  it("upsert overwrites status + nonce + lastTickAt only", () => {
    const s = new PersistenceStore({ path: dbPath() });
    s.upsertSession({
      runId: "0xabc", tokenId: "42", signer: "0xAB", scenarioId: "tiny",
      status: "active", expectedNonce: "0", createdAt: 1, lastTickAt: 1,
    });
    s.upsertSession({
      runId: "0xabc", tokenId: "42", signer: "0xAB", scenarioId: "tiny",
      status: "completed", expectedNonce: "5", createdAt: 1, lastTickAt: 99,
    });
    const active = s.loadActiveSessions();
    expect(active).toHaveLength(0); // no longer active
    s.close();
  });

  it("appends and loads trace lines in order", () => {
    const s = new PersistenceStore({ path: dbPath() });
    s.upsertSession({
      runId: "0xabc", tokenId: "1", signer: "0xAB", scenarioId: "s",
      status: "active", expectedNonce: "0", createdAt: 1, lastTickAt: 1,
    });
    s.appendTrace("0xabc", 2, JSON.stringify({ tickId: 2, action: "noop" }));
    s.appendTrace("0xabc", 1, JSON.stringify({ tickId: 1, action: "buy" }));
    s.appendTrace("0xabc", 3, JSON.stringify({ tickId: 3, action: "sell" }));
    const text = s.loadTrace("0xabc");
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.tickId)).toEqual([1, 2, 3]);
    s.close();
  });

  it("deleteSession removes both session and trace", () => {
    const s = new PersistenceStore({ path: dbPath() });
    s.upsertSession({
      runId: "0xabc", tokenId: "1", signer: "0xAB", scenarioId: "s",
      status: "active", expectedNonce: "0", createdAt: 1, lastTickAt: 1,
    });
    s.appendTrace("0xabc", 1, "x");
    s.deleteSession("0xabc");
    expect(s.loadActiveSessions()).toHaveLength(0);
    expect(s.loadTrace("0xabc")).toBe("");
    s.close();
  });
});
