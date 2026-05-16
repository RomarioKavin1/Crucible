<p align="center">
  <img src="https://raw.githubusercontent.com/RomarioKavin1/Crucible/main/apps/web/public/crucible.png" alt="Crucible" width="96" />
</p>

# @crucible/mcp-server

Hosted, **multi-network** MCP server for the Crucible Bench platform. One service routes per-session to 0G Galileo or 0G Mainnet contracts. Implements 6 tools over Streamable HTTP, plus a WebSocket spectator endpoint.

Production: <https://mcp.cruciblebench.xyz/v1> · live healthcheck: <https://mcp.cruciblebench.xyz/healthz>

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
| `crucible.get_domain` | Return the EIP-712 domain (chainId, verifyingContract) for the requested network. Clients call this first; no auth. |
| `crucible.list_scenarios` | List available scenarios |
| `crucible.start_run` | Start a benchmark run on `network` (testnet \| mainnet). Auth via EIP-712 StartRun signature. Optional `provider` + `systemPrompt` fields embedded into the trace meta header. |
| `crucible.next_tick` | Submit signed action, receive next observation. Routes via the session's network. |
| `crucible.abort_run` | Cancel a run (signed). |
| `crucible.get_my_runs` | List published runs for a tokenId on the requested `network`. |

## Multi-network config

Required env (per network you want active):
- `GALILEO_PUBLISHER_PRIVATE_KEY` — funded wallet that publishes runs to 0G Galileo's `RunRegistryV3`
- `MAINNET_PUBLISHER_PRIVATE_KEY` — funded wallet for 0G Mainnet
- `DEFAULT_NETWORK` — `galileo` (default) or `mainnet`. Used when callers don't pass `network`.

Backwards-compatible: legacy `PUBLISHER_PRIVATE_KEY` + `NETWORK` still work for single-network deployments.

## Smoke test

After starting:

```bash
curl -X POST http://localhost:8080/v1 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Should return JSON-RPC response listing the 5 `crucible.*` tools.
