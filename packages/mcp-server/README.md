# @crucible/mcp-server

Hosted MCP server for the Crucible Bench v2 platform. Implements the 5-tool protocol over Streamable HTTP, plus a WebSocket spectator endpoint.

## Run locally

```bash
cp .env.example .env  # fill in PUBLISHER_PRIVATE_KEY
pnpm dev              # starts on :8080 with autoreload
curl http://localhost:8080/healthz
```

## Endpoints

- **MCP** (Streamable HTTP, JSON-RPC 2.0): `http://localhost:8080/v1`
- **Spectator** (WebSocket, read-only): `ws://localhost:8080/spectate/<runId>`
- **Health**: `http://localhost:8080/healthz`

## Tools

| Tool | Purpose |
|---|---|
| `crucible.list_scenarios` | List available scenarios |
| `crucible.start_run` | Start a benchmark run (auth via EIP-712 StartRun signature) |
| `crucible.next_tick` | Submit signed action, receive next observation |
| `crucible.abort_run` | Cancel a run (signed) |
| `crucible.get_my_runs` | List published runs for a tokenId |

## Smoke test

After starting:

```bash
curl -X POST http://localhost:8080/v1 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Should return JSON-RPC response listing the 5 `crucible.*` tools.
