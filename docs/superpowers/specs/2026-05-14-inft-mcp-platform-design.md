# Crucible v2 — INFT + MCP Platform Design Spec

**Date:** 2026-05-14
**Branch:** `feat/inft-mcp`
**Supersedes:** v1 (`feat/onchain` — merged to main)

---

## 0. Vision

Crucible v1 was a useful proof — six deterministic scenarios, an on-chain leaderboard, a baseline Anthropic agent — but its agent integration surface was a YAML recipe consumed by a single CLI runner. That framing implicitly limits the product to "Anthropic prompts run by us." For a platform whose value is *serving the autonomous-agent ecosystem on 0G*, that's the wrong framing.

v2 fixes the framing. The product becomes:

> A web platform where any autonomous agent — represented by an ERC-7857 INFT on 0G — connects via MCP, plays a scenario through cryptographically signed tick-by-tick decisions, and lands on a public, end-to-end verifiable leaderboard.

The user never installs anything. The agent never gives us its private key. Every action in every trace is wallet-signed by the agent's INFT-bound key. Anyone can re-verify any leaderboard entry without trusting Crucible.

---

## 1. What changes from v1

| Layer | v1 | v2 |
|---|---|---|
| **Identity** | `AgentRegistry` placeholder ERC-721 | `AgentINFT` (simplified ERC-7857) on Galileo, with `delegateAccess` for hot/cold key separation |
| **Agent integration surface** | Hand-written YAML recipe + CLI flag | MCP server hosted at `mcp.cruciblebench.xyz`, agent connects via standard MCP client |
| **Per-action authentication** | None (CLI publishes on the agent's behalf) | EIP-712 signature on every tick action; server verifies signer ∈ {INFT owner, delegated assistant} |
| **Trace authenticity** | Trusted (Crucible signs RunRegistry tx) | Self-verifying — every trace entry carries its signature; anyone can replay against on-chain INFT state |
| **User onboarding** | `pnpm install`, write recipe, run CLI, mint NFT manually | Wallet-connect at `cruciblebench.xyz`, mint INFT in-browser, configure MCP server URL in their agent's runtime |
| **Live observability** | Post-run replay only | Real-time spectator dashboard streamed via WebSocket while the run is in progress |
| **`crucible run` CLI** | The product | Demoted to optional power-user / dev-mode tool |
| **Recipe YAML** | Required | Removed (or kept only for the optional `0G Compute Managed Runtime` mode) |
| **Leaderboard** | 8 runs under one placeholder agent | Fresh start; every entry is a verifiable INFT-attested run |

What v1 components are **kept unchanged**: scenario bundle format (`manifest.yaml` + `ticks.jsonl` + `news.jsonl`), the engine itself (`@crucible/core`), 0G Storage upload (`@crucible/og-client`), `ScenarioRegistry` contract on Galileo (scenarios don't need re-publishing), all 6 hand-curated scenarios, `apps/web` shell + scenario-detail UI, AI Coach package and routes (orthogonal feature).

---

## 2. Identity — `AgentINFT` (simplified ERC-7857)

### 2.1 Why ERC-7857 (not ERC-8004)

0G's native standard is ERC-7857. ERC-8004 is the broader EVM trustless-agent standard used on Ethereum / Base / Mantle / Celo. Aligning with 7857 means:

- 0G's AIverse marketplace can list Crucible-benchmarked agents directly when AIverse ships
- Other 0G-native projects' INFTs can be benchmarked here without re-registration
- The INFT is the *agent itself* (description, weights commitment, future encrypted brain), not just an endpoint pointer — closer to what a trading-agent identity actually is

ERC-8004 is explicitly out of scope.

### 2.2 What gets simplified for v1

The full ERC-7857 spec includes encrypted metadata, TEE/ZKP-backed re-encryption on transfer, and oracle-validated `iTransferFrom`. **0G has not deployed a public TEE oracle as of 2026-05-14**, so the encryption-transfer flow is non-functional in production. v2 ships a *simplified ERC-7857* implementation:

| ERC-7857 feature | v1 status | v2 status | v3 plan |
|---|---|---|---|
| `IntelligentData { dataDescription, dataHash }` | n/a | **Plaintext** — leaderboard reads `dataDescription` to display "Agent #847 — Momentum trader v3" | Encrypted, oracle-decryptable, when 0G ships TEE oracle |
| `iTransferFrom(...)` with `TransferValidityProof` | n/a | **Reverts** — INFTs are non-transferable in v2 | Implemented when oracle ships |
| Standard ERC-721 `transferFrom` | n/a | **Disabled** — would orphan delegations | Replaced by `iTransferFrom` in v3 |
| `delegateAccess(address assistant)` | n/a | **Fully implemented** — additive list, `getDelegations(tokenId)` getter | Persists; max 100 delegations cleared on transfer (per spec) |
| `authorizeUsage()` / `revokeAuthorization()` | n/a | Stub — interface present, used in v3 for "let Crucible run my agent for 24h" managed-runtime auth |
| `verifier()` | n/a | Returns `address(0)` (no oracle yet) | Returns deployed `TeeVerifier` address |

### 2.3 The contract surface (Solidity)

```solidity
interface IAgentINFT is IERC721, IERC7857Metadata {
  // Mint a new INFT to msg.sender. dataDescription is plaintext in v1.
  function mint(string calldata dataDescription, bytes32 dataHash) external returns (uint256 tokenId);

  // Add an operational signing key authorized to act on behalf of this INFT.
  function delegateAccess(uint256 tokenId, address assistant) external;
  function revokeAccess(uint256 tokenId, address assistant) external;
  function isAuthorized(uint256 tokenId, address signer) external view returns (bool);
  function getDelegations(uint256 tokenId) external view returns (address[] memory);

  // Reverse lookup: list tokenIds owned by an address (server-maintained off-chain too,
  // but a getter is convenient for one-off lookups).
  function tokensOf(address owner) external view returns (uint256[] memory);

  // ERC-7857 stubs (revert in v1; implemented in v3 with TEE oracle).
  function iTransferFrom(address, address, uint256, TransferValidityProof[] calldata) external;
  function verifier() external view returns (address);
}
```

`isAuthorized(tokenId, signer)` is the server's per-action check: returns true if `signer == ownerOf(tokenId)` OR if the signer is in `getDelegations(tokenId)`.

### 2.4 Hot/cold key separation

The intended deployment pattern documented for users:

```
COLD:  INFT owner wallet (hardware wallet / vault) — holds the NFT
WARM:  Operational signing wallet (in agent's runtime env)
       └─→ delegated via INFT.delegateAccess(tokenId, warmAddress)

Crucible accepts signatures from EITHER wallet.
Compromise of warm key → owner revokes via revokeAccess; INFT is safe.
```

This is the first documented production use of `delegateAccess` in the 0G ecosystem.

### 2.5 What we ship for the contract

- New Foundry contract `contracts/src/AgentINFT.sol`
- Foundry tests covering: mint, delegateAccess, revoke, isAuthorized matrix, transfer reverts, tokensOf
- `scripts/deploy-agent-inft.ts` for Galileo deployment
- ABI export to `packages/og-client/src/abis.ts`
- New `AgentINFTClient` class in `packages/og-client/src/agent-inft.ts`

---

## 3. Connection — Hosted MCP Server

### 3.1 Why MCP only

A protocol for autonomous agents must (a) be a real ecosystem standard, (b) carry first-class support for tool-style invocations, (c) work for agents built in any language. MCP satisfies all three. A2A is also a candidate but requires the agent to host an endpoint Crucible can reach, which excludes the large majority of agents that run in private environments. MCP inverts: the agent connects out to us.

A2A driver mode and HTTP-naive mode are explicitly out of scope.

### 3.2 Transport

**Streamable HTTP** (per modern MCP spec). Single endpoint, request/response with optional streaming response. Supported by every current MCP client SDK (TS, Python, others). WebSocket is a future option for fully push-based server→agent messaging if needed; not required for v1 because the request/response shape of `next_tick` already works.

Server URL: `https://mcp.cruciblebench.xyz/v1`

### 3.3 Tool surface (5 tools, session-scoped after auth)

```ts
// Discovery
crucible.list_scenarios() → Array<{
  id: string;
  name: string;
  difficulty: 1..5;
  kind: "historical" | "synthetic";
  totalTicks: number;
  asset: string;
  description: string;
}>

// Lifecycle
crucible.start_run({
  scenarioId: string;
  signature: string;        // EIP-712 sig over { method:"start_run", scenarioId, nonce }
  signer: address;
}) → {
  runId: string;            // bytes32, assigned by server
  ticksRemaining: number;
  observation: TickObservation;  // tick 0
  spectatorUrl: string;
}

// The tight loop — single combined tool, returns the next observation immediately
crucible.next_tick({
  runId: string;
  action: { kind: "market_buy" | "market_sell" | "noop"; qty: uint256; reasoning: string };
  signature: string;        // EIP-712 over the action
  signer: address;
}) → {
  tickId: number;
  fill?: { price: number; qty: number };
  observation?: TickObservation;  // next tick (omitted iff done)
  ticksRemaining: number;
  done: boolean;
  scorecard?: Scorecard;
  runUrl?: string;          // populated on the final response
}

// Cleanup / cancel
crucible.abort_run({
  runId: string;
  reason?: string;
  signature: string;
  signer: address;
}) → { aborted: true }

// User-facing
crucible.get_my_runs() → Array<{
  runId: string;
  scenario: string;
  status: "in_progress" | "completed" | "aborted";
  scorecard?: Scorecard;
  runUrl?: string;
}>
```

### 3.4 Auth handshake on `initialize`

Per MCP, the first interaction is `initialize`. The server returns its capabilities and **a fresh nonce in the response metadata**. The agent's first tool call must be `crucible.start_run` with a signature over that nonce + action payload. The server:

1. `ecrecover(EIP712(payload), signature) === signer`
2. Read `signer` against `AgentINFT.tokensOf(signer)` — if no INFTs, reject with `WALLET_NOT_REGISTERED` and a link to `cruciblebench.xyz/register`
3. If multiple tokenIds, the agent must include `tokenId` in the call (otherwise reject with `TOKEN_ID_REQUIRED`)
4. For the chosen tokenId, verify `AgentINFT.isAuthorized(tokenId, signer) === true`
5. Bind session to `(tokenId, signer)`. From here on, every signed action is verified against the session-bound tokenId via `isAuthorized`.

Sessions hold a server-side monotonic nonce, incremented on every accepted action.

---

## 4. Authentication — EIP-712 Signed Actions

### 4.1 Domain + types

```ts
domain = {
  name: "CrucibleBench",
  version: "2",
  chainId: 16602,                            // 0G Galileo
  verifyingContract: <RunRegistryV2 address>,
}

types.Action = [
  { name: "runId",     type: "bytes32" },
  { name: "tickId",    type: "uint32"  },
  { name: "kind",      type: "string"  },   // "market_buy" | "market_sell" | "noop"
  { name: "qty",       type: "uint256" },   // base units, 18 decimals
  { name: "reasoning", type: "string"  },
  { name: "nonce",     type: "uint256" },   // strictly increasing per session
]

types.StartRun = [
  { name: "scenarioId", type: "string" },
  { name: "tokenId",    type: "uint256" },
  { name: "nonce",      type: "uint256" },
]

types.AbortRun = [
  { name: "runId",  type: "bytes32" },
  { name: "reason", type: "string"  },
  { name: "nonce",  type: "uint256" },
]
```

### 4.2 Per-tick verification (server)

Pseudocode for `next_tick`:

```ts
const recovered = ecrecover(eip712Hash(domain, "Action", action), signature);
if (recovered !== signer)                           reject("BAD_SIGNATURE");
if (!session.isActive(runId))                       reject("INVALID_RUN");
if (action.nonce !== session.expectedNonce + 1)     reject("BAD_NONCE");
if (!await agentINFT.isAuthorized(session.tokenId, signer))
                                                    reject("UNAUTHORIZED_SIGNER");
// All checks passed
session.expectedNonce += 1;
const fill = engine.applyAction(runId, action);
trace.append({ tickId, observation, action, signature, signer });
return { fill, observation: engine.nextObservation(runId), ticksRemaining, done };
```

Failure modes that don't advance the engine: bad sig, bad nonce, unauthorized signer, malformed payload. Per-tick deadline (30s) IS enforced — agent's `next_tick` call must arrive within 30s of the previous response, else server records a `timeout` action and continues; 5 consecutive timeouts → run auto-aborted.

---

## 5. Trace Verification

Trace lines stored in `trace.jsonl` (then uploaded to 0G Storage):

```json
{"tickId":1,"observation":{...},"action":{...},"signature":"0xa1…","signer":"0xAB…"}
```

Anyone can audit any run from on-chain data alone:

```
1. Read RunRegistryV2.runs(runId) → { tokenId, traceRoot, scorecardHash, scenarioId, agentINFTContract }
2. Pull trace by traceRoot from 0G Storage
3. For each line:
   a. ecrecover(EIP712(domain, "Action", action), signature) === signer  ✓
   b. AgentINFT(agentINFTContract).isAuthorized(tokenId, signer) === true  ✓
4. Hash(traceJsonl) === traceRoot  ✓
5. Re-run engine over (scenario, applied actions) → same scorecard? === scorecardHash  ✓
```

If all five hold, run is provably authentic. Server-side `crucible.verify(runId)` MCP tool exposes this. A `/verify/[runId]` page in the web app does the same check in-browser.

---

## 6. Web Platform (`apps/web`)

### 6.1 Information architecture

```
/                          Landing (existing)
/scenarios                 Catalog (existing)
/scenarios/[id]            Scenario detail with Overview/Leaderboard/Methodology (existing, leaderboard reads new RunRegistryV2)
/leaderboard               Global leaderboard (existing, reads RunRegistryV2)
/community                 Coming-soon (existing)

/login                     [NEW] wallet-connect bounce page
/my-agents                 [NEW] list user's INFTs + Mint flow + Manage delegations
/agents/[tokenId]          [NEW] single-INFT detail: description, runs history, delegated keys
/agents/[tokenId]/start    [NEW] pick scenario → spawn run session, show MCP connection card
/runs/live/[runId]         [NEW] live spectator dashboard (WebSocket from server)
/runs/[runId]              Existing post-run replay
/verify/[runId]            [NEW] in-browser audit of a run's trace + signatures
/register                  [NEW] standalone "I have a wallet, let me mint an INFT" page (linked from MCP error responses)
```

### 6.2 Login + agent management

- **Wallet-connect** via RainbowKit + 0G Galileo chain config in `wagmi`.
- **Mint INFT**: in `/my-agents`, "Add Agent" form (name, description, optional dataHash). Calls `AgentINFT.mint(dataDescription, dataHash)` from connected wallet. Optimistic UI; refresh on event.
- **Import existing INFT**: if the user already minted an INFT elsewhere (or via CLI), they connect with the owner wallet and the page picks it up automatically via `tokensOf(owner)`.
- **Manage delegations**: per-INFT card lists current delegated assistants, "Add" / "Revoke" buttons calling `delegateAccess` / `revokeAccess`.

### 6.3 Starting a run

`/agents/[tokenId]/start`:

```
[Pick a scenario ▾]      [Start Run]

After clicking:
─────────────────────────────────
 Run started — runId: abc123
 Connect your agent to this MCP server:

   URL:     https://mcp.cruciblebench.xyz/v1
   Bind:    runId=abc123  tokenId=847

 Connection guide:                          [TS] [Python] [OpenClaw] [Cursor]
 ┌────────────────────────────────────────┐
 │ // 30 LOC TS reference example...       │
 └────────────────────────────────────────┘

 Live spectator: https://cruciblebench.xyz/runs/live/abc123  [Open]
─────────────────────────────────
 Status: Waiting for agent to connect…
```

When the agent connects to the MCP server with the matching runId, the spectator page goes live.

### 6.4 Live spectator dashboard

`/runs/live/[runId]` opens a WebSocket to `wss://mcp.cruciblebench.xyz/spectate/abc123` (read-only, no auth). Server pushes:

- Tick observations as they're served
- Actions as they're verified and applied
- Reasoning text from the latest action
- Equity curve point per tick
- Status events (connected, timeout, aborted, completed)

UI reuses `ScenarioReplay`, `EquityCurve`, `AgentReasoningStream`, `PnLPanel` from `@crucible/ui-kit` — but driven by live WS frames instead of static jsonl. New small adapter component `LiveRunReplay` wraps the existing components.

When `done:true` arrives, banner flips to "Published as Run #19 — view on leaderboard."

---

## 7. Engine Integration

The MCP server is a thin per-session wrapper around the existing scenario engine in `@crucible/core`:

```
Session lifecycle:
  start_run  → loadScenario(id) → engine.init() → return tick 0 observation
  next_tick  → verify sig → engine.applyAction(action) → engine.next() → return next observation
  abort_run  → engine.abort()
  on done    → uploadTrace() + publishRun()
```

State is held in process for v1 (single-instance Node service). Future scaling: persist session state to Redis, upgrade to multiple instances behind a load balancer.

The engine itself is unchanged. We only:
- Add `engine.applyAction(action)` ↔ existing tick-loop consumer interface (already exists)
- Add a "session" type that wraps `EngineHandle` with the bound tokenId, signer, nonce counter, deadline timer

---

## 8. Storage + Publishing

Unchanged conceptually. On `done:true`:

1. Serialize `trace.jsonl` (with embedded sigs) and `scorecard.json`
2. Upload to 0G Storage via existing `uploadFile` helper → returns `traceRoot`
3. Call `RunRegistryV2.publish(tokenId, scenarioId, traceRoot, scorecardHash)` — signed by server's operational wallet (same as today's deployer wallet); the run is attributed to the INFT tokenId, not the publisher
4. Emit MCP `done` response with `runUrl: https://cruciblebench.xyz/runs/19`

`RunRegistryV2`:
- Same struct as v1 RunRegistry but: `agentINFTContract` field added so verifiers know which contract to call `isAuthorized` against
- Owner-allowlist for publishing (only Crucible's operational wallet) — same model as v1
- Future v3: open publishing — anyone can submit a run and the contract self-verifies signatures

---

## 9. Migration from v1

- v1 `AgentRegistry` (`0x0763d1...`) → frozen, no new mints. Documented in README under "Deprecated v1 contracts" section once v2 ships.
- v1 `RunRegistry` (`0xc514347...`) → frozen, no new writes. The 8 historical runs (Run #1–#8) remain queryable on-chain forever.
- v1 `ScenarioRegistry` (`0xfCe7933...`) → **kept active.** v2 `RunRegistryV2` references the same scenarios.
- v1 leaderboard at `cruciblebench.xyz/leaderboard` → replaced by v2 leaderboard reading from `RunRegistryV2`. The 8 v1 runs are not migrated forward — fresh start under v2 identity model. Linked from a "Legacy v1 leaderboard" toggle in the UI for transparency, with a callout "These predate the verifiable-signature requirement — kept for historical reference."
- v1 CLI (`crucible run`) → kept functional (it's not breaking anything), documented as "v1 dev/research mode," but not the headline product.

A single PR at v2 ship-time:
- Move existing "Deployed contracts (v1 — active)" README section into "Deprecated v1 contracts"
- Add new "Deployed contracts (v2 — active)" section with the new INFT + RunRegistryV2 addresses
- Update root README architecture diagram

---

## 10. Stretch — 0G Compute Managed Runtime

Optional. Powerful demo of the full 0G stack but not required for v2 ship.

For users who don't have their own agent yet:

1. From `/my-agents`, click "Create Managed Agent"
2. Pick a 0G Compute model (`zai-org/GLM-5-FP8`, etc.) + write a system prompt + (optional) trading hyperparams
3. We mint an INFT with `dataDescription = "managed: GLM-5-FP8 / momentum-v1 / 0xCRUCIBLE"`
4. We call `delegateAccess(tokenId, crucibleOperationalWallet)` — explicit user authorization
5. From now on, "Start Run" runs server-side, calling 0G Compute Router with the user's chosen model on each tick
6. Crucible's operational wallet signs each action (legitimately — it's a delegated assistant)
7. Run publishes to leaderboard like any other

This is the **fully verifiable, fully on-0G** story: identity (INFT on 0G Chain), inference (0G Compute Router), trace storage (0G Storage), leaderboard (RunRegistry). Single-vertical demo.

If implemented, it's gated behind a "Managed runtime" tab on `/my-agents` and uses 0G Compute SDK (`@0gfoundation/0g-compute-ts-sdk`) to bill the user's deposit on the Compute Ledger.

---

## 11. Out of Scope (v2)

- **A2A driver mode** — moved to optional v3 if demand exists
- **HTTP-naive endpoint** (give an arbitrary URL) — superseded by MCP
- **`@crucible/agent-bridge`** signing daemon — not needed; agents own their wallets
- **`@crucible/agent-sdk`** required SDK — replaced by reference example snippets per language
- **Encrypted INFT metadata + TEE re-encryption transfers** — blocked on 0G TEE oracle deployment
- **AIverse marketplace integration** — blocked on AIverse publishing contract addresses
- **Mainnet deployment** — Galileo only for v2; mainnet after stabilization
- **Multi-instance MCP server scaling** — single-instance Node service for v2; Redis + LB later
- **Mobile-first dashboard** — desktop-first; responsive but not mobile-optimized
- **Cross-chain INFT support** (e.g. ERC-8004 on Base) — out of scope; 0G-native only
- **Real-time agent leaderboard during a run** (e.g. ranks among in-flight runs) — too noisy; only published runs rank
- **Browser-side wallet acting as the agent** — interesting but blocked on key handling story; not v2

---

## 12. Risks + Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MCP client SDK Streamable HTTP support uneven across runtimes | Medium | Medium | Provide reference examples in TS + Python using the official `@modelcontextprotocol/sdk`; document tested clients |
| Agents struggle to integrate signing into their MCP loop | High | High | Ship a 30-LOC reference example; provide a hosted "test your agent" sandbox URL with mock scenario; FAQ doc |
| Per-tick deadline (30s) too tight for slow agent loops | Low | Medium | Configurable per-scenario; default 30s; long-deadline scenarios available for compute-heavy agents |
| LLM-driven agents stall mid-run (forget to keep calling `next_tick`) | Medium | Low | Already-existing `ticksRemaining` field nudges them; weak agents score worse, which is the benchmark working |
| INFT contract bug → all v2 runs invalid | Low | Critical | Foundry tests; deploy to Galileo for soak before linking from web UI; bounty channel for security review |
| `delegateAccess` pattern abused (compromised hot key drains nothing — INFT non-transferable in v2) | Low | Low | Owner can `revokeAccess` instantly; only attack surface is "score a fake bad run" which is just leaderboard noise |
| 0G Storage retention failures lose traces post-publication | Low | High | Monitor storage; backup trace JSONL to a secondary store (R2/S3) for v2; document SLA |
| MCP server downtime during a long-running benchmark | Medium | Medium | Persist session state to disk; on restart, resume in-flight runs; document estimated downtime |
| RainbowKit + 0G Galileo chain config friction | Medium | Low | Ship a custom chain entry; test with MetaMask + Coinbase Wallet + Rainbow + WalletConnect |
| Spectator dashboard floods server with WS conns on a viral run | Low | Low | Throttle, cap concurrent spectators per run, fan-out via Redis pub-sub if it materializes |

---

## 13. Components Touched

**New:**
- `contracts/src/AgentINFT.sol` + tests + deploy script
- `contracts/src/RunRegistryV2.sol` + tests + deploy script
- `packages/og-client/src/agent-inft.ts` (client wrapper)
- `packages/og-client/src/run-registry-v2.ts` (client wrapper)
- `packages/mcp-server/` (new workspace package — Streamable HTTP MCP server)
  - `src/server.ts` (MCP setup)
  - `src/tools/*.ts` (5 tools)
  - `src/auth.ts` (EIP-712 verification + INFT lookup)
  - `src/session.ts` (per-runId state machine wrapping engine)
  - `src/spectator.ts` (WebSocket fanout for live dashboard)
  - `src/index.ts` (Fastify entry)
- `apps/web/app/login/page.tsx`
- `apps/web/app/my-agents/page.tsx` + `MyAgentsClient.tsx`
- `apps/web/app/agents/[tokenId]/page.tsx` + tabs
- `apps/web/app/agents/[tokenId]/start/page.tsx` + `RunStarterClient.tsx`
- `apps/web/app/runs/live/[runId]/page.tsx` + `LiveRunClient.tsx`
- `apps/web/app/verify/[runId]/page.tsx` + `VerifierClient.tsx`
- `apps/web/app/register/page.tsx`
- `apps/web/lib/wagmi.ts` (RainbowKit + 0G chain config)
- `apps/web/lib/contracts.ts` (read-only INFT + RunRegistryV2 helpers)
- `apps/web/components/InftMintForm.tsx`, `DelegationManager.tsx`, `ConnectionGuideTabs.tsx`, `LiveRunReplay.tsx`
- `examples/reference-agent-ts/` (30-LOC reference)
- `examples/reference-agent-python/` (30-LOC reference)
- `docs/protocol/v2.md` (the protocol spec — separate from this design doc)

**Modified:**
- `README.md` (deprecate v1 section, add v2 section, new architecture diagram)
- `apps/web/app/leaderboard/page.tsx` (read RunRegistryV2; legacy toggle for v1)
- `apps/web/app/scenarios/[id]/page.tsx` Leaderboard tab (read RunRegistryV2)
- `packages/og-client/src/index.ts` (export new clients)
- `packages/og-client/src/abis.ts` (add new ABIs)
- `contracts/deployed-addresses.json` (add v2 entries)

**Untouched:**
- `@crucible/core` engine (used as-is)
- `@crucible/skills`
- `@crucible/coach` (orthogonal)
- `@crucible/scenario-builder`
- All scenario bundles
- `apps/cli` (kept functional for dev mode; not the headline)

---

## 14. Acceptance Criteria for v2 Ship

A user with an Anthropic key and an empty Galileo wallet can, in under 10 minutes:

1. Visit cruciblebench.xyz, connect wallet, get faucet tokens
2. Mint an INFT via `/my-agents`
3. Delegate a hot wallet they generated locally
4. Click "Start Run" on `/agents/[tokenId]/start` and pick `choppy-range`
5. Copy the connection snippet, paste into a 30-LOC TS file, run `tsx my-agent.ts`
6. Watch their agent trade live in the spectator dashboard
7. See the run published as a verified entry on the leaderboard
8. Open `/verify/[runId]`, click "Run audit," and see all checks ✓

If that flow works, v2 is done. If any step requires manual help from us, it's not done.

---

## 15. Open Questions to Resolve Before Plan Phase

These are decided in this spec or noted as intentional defers; included here to confirm alignment:

- **INFT ownership transfer in v2: blocked.** Confirmed. v3 adds it with TEE oracle.
- **Multiple INFTs per wallet: supported.** Agent must specify `tokenId` in `start_run` if more than one.
- **Per-tick nonce monotonicity: server-enforced strictly.** Replay impossible.
- **Single-instance MCP server: yes for v2.** Multi-instance with Redis is v3.
- **CLI `crucible run` kept alive: yes.** Documented as dev mode.
- **`AgentRegistry` v1: frozen, never deleted.** Run history persists.
- **Leaderboard reset under v2 identity: yes.** Legacy v1 toggle for transparency.
- **Mainnet: not v2.** v2 is Galileo-only.
- **0G Compute Managed Runtime: stretch.** Build only if v2 critical-path work finishes early.

---

End of spec. Plan derived from this lives at `docs/superpowers/plans/2026-05-14-inft-mcp-platform.md`.
