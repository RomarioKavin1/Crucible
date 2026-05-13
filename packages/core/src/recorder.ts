import { open, type FileHandle } from "node:fs/promises";
import type { TraceEntry } from "./types";

export interface RunRecorder {
  append(entry: TraceEntry): Promise<void>;
  close(): Promise<void>;
}

export class MemoryRecorder implements RunRecorder {
  private buf: TraceEntry[] = [];

  async append(entry: TraceEntry): Promise<void> {
    this.buf.push(entry);
  }

  async close(): Promise<void> {
    /* no-op */
  }

  entries(): TraceEntry[] {
    return [...this.buf];
  }
}

export class JsonlFileRecorder implements RunRecorder {
  private handle: FileHandle | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureOpen(): Promise<FileHandle> {
    if (!this.handle) {
      this.handle = await open(this.filePath, "w");
    }
    return this.handle;
  }

  async append(entry: TraceEntry): Promise<void> {
    const fh = await this.ensureOpen();
    await fh.write(JSON.stringify(entry) + "\n");
  }

  async close(): Promise<void> {
    if (this.handle) {
      await this.handle.close();
      this.handle = null;
    }
  }
}
