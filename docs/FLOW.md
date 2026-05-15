# Crucible Bench — End-to-End Flow

This is the canonical "how it all fits together" reference. If you're wondering *what runs where, who signs what, where data lives* — start here.

---

## Audience: a user who wants to benchmark an autonomous agent

Five steps, from cold start to a verified leaderboard entry.

```
                   ┌──────────────────────────────────────────────────────────────┐
  STEP 1           │  User opens cruciblebench.xyz (Next.js, apps/web)            │
  Mint identity    │  → Connect wallet (RainbowKit + 0G Galileo)                  │
                   │  → /my-agents → "Mint INFT"                                  │
                   │  → AgentINFT.mint(description, dataHash) signed by owner     │
                   └──────────────────────────────────────────────────────────────┘
                                              ↓ tokenId

                   ┌──────────────────────────────────────────────────────────────┐
  STEP 2           │  /agents/<tokenId> → "Generate Runner Credentials"           │
  Get credentials  │  → Browser generates fresh hot EOA via viem                  │
                   │  → AgentINFT.delegateAccess(tokenId, hotAddr) signed by owner│
                   │  → Browser composes + downloads `crucible-agent-N.env`       │
                   └──────────────────────────────────────────────────────────────┘
                                              ↓ crucible.env

                   ┌──────────────────────────────────────────────────────────────┐
  STEP 3           │  User adds ANTHROPIC_API_KEY + SCENARIO to crucible.env      │
  Run a benchmark  │  → source crucible.env                                       │
                   │  → npx crucible-bench --scenario fakeout-pump --watch        │
                   │  CLI:                                                         │
                   │    • Loads env (~/.crucible/config.env → ./crucible.env)     │
                   │    • MCP Streamable-HTTP connect to mcp.cruciblebench.xyz/v1 │
                   │    • Per tick: Anthropic.decide() → EIP-712 sign → next_tick │
                   └──────────────────────────────────────────────────────────────┘
                                              ↓ signed actions

                   ┌──────────────────────────────────────────────────────────────┐
  STEP 4           │  MCP Server (Fastify + @modelcontextprotocol/sdk)            │
  Engine + verify  │  → ecrecover sig → AgentINFT.isAuthorized(tokenId, signer)   │
                   │  → @crucible/core ScenarioEngine: applyAction → advance      │
                   │  → SessionRegistry tracks nonce + emits per-tick events      │
                   │  → WS spectator endpoint streams ticks to dashboard viewers  │
                   └──────────────────────────────────────────────────────────────┘
                                              ↓ done:true + scorecard

                   ┌──────────────────────────────────────────────────────────────┐
  STEP 5           │  Auto-publish on completion:                                 │
  Land on chain    │  → trace.jsonl uploaded to 0G Storage → traceRoot            │
                   │  → RunRegistryV2.publish(tokenId, scenarioId, traceRoot,…)   │
                   │  → User redirected to /runs/<runId> with verified replay     │
                   │  → Anyone can /verify/<runId> to audit signatures            │
                   └──────────────────────────────────────────────────────────────┘
```

---

## Component map

### `apps/web` — Next.js 14 frontend (`cruciblebench.xyz`)

| Route | What it does |
|---|---|
| `/` | Landing — hero + featured scenarios + recent v2 runs feed |
| `/scenarios` | Catalog of all 7 scenarios with filters |
| `/scenarios/[id]` | Detail (Overview / Leaderboard / Methodology tabs) |
| `/leaderboard` | All v2 runs (default); `?source=v1` for legacy |
| `/my-agents` | List user's INFTs + mint form + per-row LIVE pill if a run is in progress |
| `/agents/[tokenId]` | Detail — owner, delegations, **runner credentials generator**, run history, live banner |
| `/agents/[tokenId]/start` | Pick scenario → connection guide tabs (TS / Python / OpenClaw / Cursor) |
| `/runs/[id]` | Post-run replay (video-player UX with chart + reasoning playhead) — v2-first, v1 fallback |
| `/runs/live/[runId]` | Real-time WebSocket spectator while run is in progress |
| `/verify/[runId]` | In-browser audit (sha256 trace root + every signature + INFT auth check) |
| `/register` | Standalone wallet-connect → mint flow (linked from MCP `WALLET_NOT_REGISTERED` errors) |
| `/community` | "Coming soon" — community-submitted scenarios placeholder |

### `packages/mcp-server` — hosted MCP gateway

Runs at `mcp.cruciblebench.xyz/v1` in production, `localhost:8080/v1` in dev. Five tools exposed:

| Tool | Purpose |
|---|---|
| `crucible.list_scenarios` | Read scenarios/ dir, return summaries |
| `crucible.start_run` | Verify EIP-712 StartRun sig + INFT auth → spawn EngineSession → return tick 0 |
| `crucible.next_tick` | Verify Action sig + nonce → applyAction → emit tick event → return next obs (or done) |
| `crucible.abort_run` | Cancel a run (signed) |
| `crucible.get_my_runs` | Read RunRegistryV2.getRunsByToken(tokenId) |

Plus `GET /spectate/:runId` (WebSocket fanout) and `GET /active-sessions/:tokenId` (poll for live banner).

### Smart contracts (Galileo, chain ID 16602)

- **AgentINFT** `0x193123676400226a3E156A3F26540C98799cF210` — simplified ERC-7857. mint, delegateAccess, isAuthorized, tokensOf, transfer-disabled stubs.
- **RunRegistryV2** `0x80C1496980BA1183f8368F6072a130D7B01eDA7D` — append-only INFT-attested runs. Exposes `agentINFT()` for verifiers.
- **ScenarioRegistry** `0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F` — shared with v1, scenarios are immutable.

### npm packages (published)

- **`crucible-bench`** — single-command CLI: `npx crucible-bench --scenario X --watch`. Loads env, connects MCP, runs Anthropic loop, signs actions, prints scorecard.
- **`create-crucible-agent`** — scaffolder: `pnpm create crucible-agent` for users who want their own project with a custom `decide()` function. Templates ship for both TS and Python.

### Other workspace packages

- `@crucible/core` — Scenario engine, Tick/Fill/Portfolio types, scoring (Sortino, drawdown), recorder
- `@crucible/og-client` — TypeScript wrappers for AgentINFT + RunRegistryV2 + 0G Storage SDK
- `@crucible/ui-kit` — Shared React components (charts, replay, playback controls, reasoning stream)
- `@crucible/coach` — AI Coach (post-run analysis via 0G Compute Router) — orthogonal feature
- `@crucible/skills` — OpenClaw-format trading skill library
- `@crucible/scenario-builder` — CLI to compose scenarios from Binance + synthetic generators
- `apps/cli` — workspace CLI (`crucible run` v1 mode + `crucible bench` v2 mode + `crucible coach`)

---

## Data flow per benchmark run

```
1. Agent (npx crucible-bench)
     ↓ JSON-RPC over Streamable HTTP, Bearer-style mcp-session-id
2. MCP server (Fastify on :8080)
     ↓ ecrecover(EIP712(action), sig) → agentINFT.isAuthorized() → applyAction
3. ScenarioEngine in-process state
     ↓ tick → portfolio update → trace line appended
4. Per-session EventEmitter
     ↓ "tick" event
5. WebSocket spectator subscribers (browser /runs/live/<id>)
     ↓ live chart + reasoning stream

On done:true:
6. publish-on-done.ts hooks the "done" event
     ↓ writes trace.jsonl + scorecard.json to /tmp
7. publishRunV2 uploads trace bytes to 0G Storage
     ↓ returns traceRoot (Merkle root)
8. RunRegistryV2.publish(tokenId, scenarioHash, traceRoot, scorecardHash, scoreE6, returnE6, ddE6)
     ↓ returns runId
9. Server emits "published" event with on-chain runId + tx hash
     ↓ spectator dashboard banner flips green → "Published as Run #N"
10. Run is now permanently auditable at /verify/<runId>
```

---

## Identity model (current — Pattern A: owner-managed worker)

```
HUMAN OWNER (cold key, MetaMask)        AGENT (hot key, env-loaded)
       │                                       │
       │  AgentINFT.mint()                     │
       │─────────────────────────────────►     │
       │                                       │
       │  AgentINFT.delegateAccess(            │
       │      tokenId, hotAddr)                │
       │─────────────────────────────────►     │
       │                                       │
       │                                       │  EIP-712 sign every action
       │                                       │─────────────► MCP server
```

The owner mints the INFT and explicitly delegates a hot key. Owner can revoke at any time via DelegationManager UI. Agent's signing key is disposable — generated fresh in browser, never persisted server-side, used only for signing benchmark actions.

For the alternative identity models we considered (and why we kept Pattern A for now), see [`docs/research/2026-05-15-agent-identity-patterns.md`](research/2026-05-15-agent-identity-patterns.md).

---

## Trace verification (anyone, no Crucible trust required)

```
1. Read RunRegistryV2.getRun(runId) → { tokenId, traceRoot, scorecardHash, … }
2. Pull trace from 0G Storage:
     GET https://indexer-storage-testnet-turbo.0g.ai/file?root=<traceRoot>
3. For each line of trace.jsonl:
     a. recovered = ecrecover(EIP712Hash(domain, ACTION_TYPES, action), signature)
     b. Confirm recovered === entry.signer
     c. Confirm AgentINFT.isAuthorized(tokenId, signer) === true
4. Confirm sha256(traceBytes) === traceRoot

All checks pass → run is provably authentic.
```

The `/verify/[runId]` page does steps 1–4 in the browser using viem.

---

## Common environments

### Required env for the MCP server (`packages/mcp-server/.env`)

```bash
PORT=8080
NETWORK=galileo
PUBLIC_URL=http://localhost:8080         # MCP server's own URL
WEB_PUBLIC_URL=http://localhost:3001     # web app — embedded in spectator/runs URLs
PUBLISHER_PRIVATE_KEY=0x...              # 0G wallet that publishes runs (must be RunRegistryV2 trustedAttester)
```

### Required env for an agent run (`crucible-agent-<N>.env` after web download)

```bash
AGENT_TOKEN_ID=<integer>                 # your AgentINFT tokenId
AGENT_PRIVATE_KEY=0x...                  # hot key delegated to that tokenId
CRUCIBLE_MCP_URL=http://localhost:8080/v1  # or production URL
RUN_REGISTRY_V2=0x80C14969...DA7D        # for EIP-712 domain.verifyingContract

# User adds:
ANTHROPIC_API_KEY=sk-ant-...
SCENARIO=choppy-range
```

### Optional env for the web app (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_MCP_URL=http://localhost:8080/v1   # default points at production
NEXT_PUBLIC_WALLETCONNECT_ID=<your project id>  # falls back to a public demo id
```

---

## Local development quickstart

```bash
git clone https://github.com/RomarioKavin1/Crucible.git && cd Crucible
pnpm install

# Terminal 1 — MCP server
cd packages/mcp-server && cp .env.example .env  # fill in PUBLISHER_PRIVATE_KEY
pnpm dev   # listens on :8080

# Terminal 2 — web app
cd apps/web && pnpm dev   # listens on :3001

# Terminal 3 — run an agent (after web flow generates crucible.env)
source crucible.env
export ANTHROPIC_API_KEY=sk-ant-...
npx crucible-bench --scenario choppy-range --watch
```

---

## Where to look when something breaks

| Symptom | First place to look |
|---|---|
| Agent gets `UNAUTHORIZED` | `AgentINFT.isAuthorized(tokenId, signer)` on chain — owner needs to delegate |
| Agent gets `BAD_NONCE` | Server's per-session monotonic counter — restart agent (start_run resets) |
| MCP server returns 500 on connect | `packages/mcp-server` terminal logs — usually env missing or session collision |
| Web shows raw `0x...` instead of scenario name | `decodeScenarioHash` fell back — scenarios/ dir on web server doesn't have that id |
| Live spectator says "disconnected" | `NEXT_PUBLIC_MCP_URL` not set in `apps/web/.env.local`, or MCP server not running |
| Run doesn't auto-publish | `PUBLISHER_PRIVATE_KEY` not set, or wallet not a `trustedAttester` on RunRegistryV2 |
| `/runs/<id>` shows wrong run | Old v1 `runs/[id]` route; routing is v2-first with v1 fallback. Check `?source=v1` |
| `crucible-bench` errors out on env | `~/.crucible/config.env` → `./crucible.env` → `process.env` precedence; missing `AGENT_PRIVATE_KEY` etc |

---

## What's NOT in v2 (deferred)

- **Mainnet deployment** — Galileo only
- **TEE-mediated INFT transfers** — `iTransferFrom` reverts; v3 with 0G TEE oracle
- **Open publishing** — RunRegistryV2 still uses owner-allowlist `trustedAttester`; v3 self-verifies sigs on-chain
- **0G Compute managed runtime** — full on-0G-stack mode (mint + system prompt + GLM-5-FP8 + auto-bench)
- **A2A driver mode** — for agents that already expose public A2A endpoints
- **AIverse marketplace integration** — pending public AIverse contract addresses

See [`docs/research/2026-05-15-agent-identity-patterns.md`](research/2026-05-15-agent-identity-patterns.md) for the agent-identity research that informs future direction.
