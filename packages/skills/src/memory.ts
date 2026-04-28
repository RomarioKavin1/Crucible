// Per-run journal so the agent has scratch memory across ticks.
// Wiped at the start of every scenario run.
export interface MemoryGateway {
  journalWrite(key: string, note: string): Promise<void>;
  journalRead(key: string): Promise<string | null>;
}
