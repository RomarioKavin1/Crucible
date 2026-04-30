import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TraceEntry } from "./types.js";

/**
 * Recorder writes one TraceEntry per tick as a JSON line. The resulting
 * trace.jsonl is the canonical input for replay, scoring, the Coach, and
 * TEE attestation, so the format must stay stable.
 */
export class FileRecorder {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }

  append(entry: TraceEntry): void {
    appendFileSync(this.path, JSON.stringify(entry) + "\n");
  }
}

/** In-memory recorder, useful for tests and Compete-mode TEE buffer. */
export class MemoryRecorder {
  readonly entries: TraceEntry[] = [];
  append(entry: TraceEntry): void {
    this.entries.push(entry);
  }
}
