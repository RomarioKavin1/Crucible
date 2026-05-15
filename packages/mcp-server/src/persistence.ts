// packages/mcp-server/src/persistence.ts
import Database from "better-sqlite3";
import path from "node:path";

export interface PersistedSession {
  runId: string;
  tokenId: string;     // bigint as decimal string
  signer: string;
  scenarioId: string;
  status: "active" | "completed" | "aborted";
  expectedNonce: string;
  createdAt: number;
  lastTickAt: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  run_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  signer TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  status TEXT NOT NULL,
  expected_nonce TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_tick_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trace_lines (
  run_id TEXT NOT NULL,
  tick_id INTEGER NOT NULL,
  line TEXT NOT NULL,
  PRIMARY KEY (run_id, tick_id)
);
`;

export class PersistenceStore {
  private db: Database.Database;

  constructor(opts: { path?: string } = {}) {
    const p = opts.path ?? process.env.SQLITE_PATH ?? path.resolve(process.cwd(), "mcp-server.sqlite");
    this.db = new Database(p);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  upsertSession(s: PersistedSession) {
    this.db.prepare(`
      INSERT INTO sessions (run_id, token_id, signer, scenario_id, status, expected_nonce, created_at, last_tick_at)
      VALUES (@runId, @tokenId, @signer, @scenarioId, @status, @expectedNonce, @createdAt, @lastTickAt)
      ON CONFLICT(run_id) DO UPDATE SET
        status=excluded.status,
        expected_nonce=excluded.expected_nonce,
        last_tick_at=excluded.last_tick_at
    `).run(s);
  }

  appendTrace(runId: string, tickId: number, line: string) {
    this.db.prepare(`INSERT OR REPLACE INTO trace_lines (run_id, tick_id, line) VALUES (?, ?, ?)`).run(runId, tickId, line);
  }

  loadActiveSessions(): PersistedSession[] {
    const rows = this.db.prepare(`SELECT * FROM sessions WHERE status = 'active'`).all() as any[];
    return rows.map((r) => ({
      runId: r.run_id, tokenId: r.token_id, signer: r.signer, scenarioId: r.scenario_id,
      status: r.status, expectedNonce: r.expected_nonce, createdAt: r.created_at, lastTickAt: r.last_tick_at,
    }));
  }

  loadTrace(runId: string): string {
    const rows = this.db.prepare(`SELECT line FROM trace_lines WHERE run_id = ? ORDER BY tick_id ASC`).all(runId) as any[];
    return rows.map((r) => r.line).join("\n") + (rows.length ? "\n" : "");
  }

  deleteSession(runId: string) {
    this.db.prepare(`DELETE FROM sessions WHERE run_id = ?`).run(runId);
    this.db.prepare(`DELETE FROM trace_lines WHERE run_id = ?`).run(runId);
  }

  close() { this.db.close(); }
}
