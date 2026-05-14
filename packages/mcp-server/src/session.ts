// packages/mcp-server/src/session.ts
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import type { EngineSession } from "./engine-adapter";

export type SessionStatus = "active" | "completed" | "aborted";

export interface Session {
  runId: string;            // 0x-prefixed bytes32
  tokenId: bigint;
  signer: string;
  scenarioId: string;
  engine: EngineSession;
  expectedNonce: bigint;
  status: SessionStatus;
  createdAt: number;
  lastTickAt: number;
  events: EventEmitter;     // emits "tick" / "action" / "done" / "abort" / "published" / "publish_failed"
}

export interface CreateOpts {
  tokenId: bigint;
  signer: string;
  scenarioId: string;
  engine: EngineSession;
}

export class SessionRegistry {
  private byRunId = new Map<string, Session>();

  create(opts: CreateOpts): string {
    const runId = "0x" + randomBytes(32).toString("hex");
    const sess: Session = {
      runId, tokenId: opts.tokenId, signer: opts.signer, scenarioId: opts.scenarioId,
      engine: opts.engine, expectedNonce: 0n, status: "active",
      createdAt: Date.now(), lastTickAt: Date.now(), events: new EventEmitter(),
    };
    this.byRunId.set(runId, sess);
    return runId;
  }

  get(runId: string): Session {
    const s = this.byRunId.get(runId);
    if (!s) throw new Error(`Unknown runId: ${runId}`);
    return s;
  }

  /** Atomically check the next nonce is exactly expected+1 and advance. */
  checkAndAdvanceNonce(runId: string, nonce: bigint): boolean {
    const s = this.get(runId);
    if (nonce !== s.expectedNonce + 1n) return false;
    s.expectedNonce = nonce;
    s.lastTickAt = Date.now();
    return true;
  }

  markCompleted(runId: string) { this.get(runId).status = "completed"; }
  markAborted(runId: string) { this.get(runId).status = "aborted"; }

  close(runId: string) { this.byRunId.delete(runId); }

  listForToken(tokenId: bigint): Session[] {
    return [...this.byRunId.values()].filter((s) => s.tokenId === tokenId);
  }
}
