// Thin wrapper over the 0G Storage TypeScript SDK.
//
// Log layer = immutable, used for scenario bundles and finished traces.
// KV layer  = mutable, used for agent recipes (versioned per agentId).
//
// We swap the SDK in once the auth flow stabilizes; for now this is the surface
// the rest of the app will program against so we can mock it in tests.

export interface LogPutResult {
  readonly rootHash: string;
}

export interface StorageClient {
  putLog(bytes: Uint8Array): Promise<LogPutResult>;
  getLog(rootHash: string): Promise<Uint8Array>;

  kvPut(key: string, value: Uint8Array): Promise<void>;
  kvGet(key: string): Promise<Uint8Array | null>;
  kvList(prefix: string): Promise<string[]>;
}
