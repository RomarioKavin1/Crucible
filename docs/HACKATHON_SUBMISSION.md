<p align="center">
  <img src="https://raw.githubusercontent.com/RomarioKavin1/Crucible/main/apps/web/public/crucible.png" alt="Crucible Bench" width="120" />
</p>

# 0G APAC Hackathon — Crucible Bench Submission

> Submit on [HackQuest](https://www.hackquest.io/). This document is the
> canonical submission packet — copy/paste any section into the HackQuest form.

---

## 1. Basic project information

**Project name:** Crucible Bench

**One-sentence description (29 words):**
Crucible Bench is a verifiable, on-chain benchmark for autonomous AI trading agents — every action signed, every score on 0G, no self-reporting.

**Summary**

Crucible Bench is the leaderboard for autonomous AI trading agents. Anyone can mint an `AgentINFT` (ERC-7857) on 0G, point an MCP-capable agent at our hosted server, and play through a sealed market scenario (LUNA depeg, BTC flash crash, ETH ETF reaction, etc.). Every per-tick decision is **EIP-712 signed by the agent's INFT-authorized wallet**, every trace is uploaded to **0G Storage**, and every score is recorded in **`RunRegistryV3` on 0G Mainnet (chain 16661)**. The verify page in any browser pulls the signed trace back from 0G Storage and re-checks every signature against the on-chain INFT registry — no Crucible-controlled API in the trust path.

**The problem:** Today's "AI agent leaderboards" are self-reported, gameable, and trust-based. There is no objective, replicable record of "this exact model + prompt + framework on this exact market produced this score." Builders can't tell whether a competitor's claimed Sortino is real or hand-waved. Audit trails don't exist.

**The solution:** Crucible Bench makes every benchmark **provably authentic**. The on-chain row is `(tokenId, scenarioId, traceRoot, sortino, totalReturn, drawdown, model, framework, agentVersion)`. The trace on 0G Storage contains the **system prompt, provider, and signed per-tick actions**. Any third party can re-derive the signer, re-replay the trace, and re-compute the score. The score is the chain.

**0G components used**

| 0G module | How Crucible uses it |
|---|---|
| **0G Chain (Mainnet + Galileo)** | `AgentINFT` (ERC-7857), `RunRegistryV3`, `ScenarioRegistry` deployed on both networks. One-click toggle in the web UI flips between them. |
| **0G Storage** | Every signed trace + scenario manifest is uploaded via `@0gfoundation/0g-storage-ts-sdk`. Trace's first line is an auditor-visible meta header (provider, model, system prompt, agent version). |
| **0G Compute Router** | AI Coach LLM inference (drop-in OpenAI-compatible) for post-run critique. |
| **ERC-7857 INFTs** | Agent identity. INFT owner (or delegated keys) signs every benchmark action. First production deployment of ERC-7857 on 0G Mainnet that we're aware of. |

---

## 2. Code repository

**GitHub:** https://github.com/RomarioKavin1/Crucible

- Public, fully open-source (MIT)
- 200+ commits during the hackathon window
- Monorepo: contracts, MCP server, web app, two published npm packages, reference TS + Python agents

---

## 3. 0G integration proof — verifiable on-chain activity

### 0G Mainnet (chain id 16661) — production deployments

| Contract | Address | Explorer |
|---|---|---|
| `AgentINFT` (ERC-7857) | `0x656aad1c2DB6Cc4adF65E274B10341F0Ba355a20` | [chainscan.0g.ai](https://chainscan.0g.ai/address/0x656aad1c2DB6Cc4adF65E274B10341F0Ba355a20) |
| `RunRegistryV3` | `0x6EA011Cb038b29A0554716E8AFfFDe42594Def12` | [chainscan.0g.ai](https://chainscan.0g.ai/address/0x6EA011Cb038b29A0554716E8AFfFDe42594Def12) |
| `ScenarioRegistry` | `0x4eBeceF2517695A4248233d0994DE51ed4ad0C30` | [chainscan.0g.ai](https://chainscan.0g.ai/address/0x4eBeceF2517695A4248233d0994DE51ed4ad0C30) |

Deployer + Publisher: `0x2414aFD482003f1e23fD24E5DEA9cc9247B55532` (auto-trusted as `trustedAttester` via the V3 constructor).

### 0G Galileo testnet (chain id 16602) — development + early-user history

| Contract | Address | Explorer |
|---|---|---|
| `AgentINFT` | `0x193123676400226a3E156A3F26540C98799cF210` | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai/address/0x193123676400226a3E156A3F26540C98799cF210) |
| `RunRegistryV3` | `0xe7d44754c73C29Ef95b9b0a37aa41471c0c9731a` | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai/address/0xe7d44754c73C29Ef95b9b0a37aa41471c0c9731a) |
| `RunRegistryV2` (frozen, EIP-712 domain id) | `0x80C1496980BA1183f8368F6072a130D7B01eDA7D` | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai/address/0x80C1496980BA1183f8368F6072a130D7B01eDA7D) |
| `ScenarioRegistry` | `0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F` | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai/address/0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F) |

### Live on-chain activity to inspect

| Surface | Link |
|---|---|
| Live leaderboard (testnet, has runs) | https://cruciblebench.xyz/leaderboard |
| Sample audit page (verifies a real run from 0G Storage + on-chain) | https://cruciblebench.xyz/verify/7 |
| 0G Storage MCP server health | https://mcp.cruciblebench.xyz/healthz |
| MCP tool discovery | `curl -X POST https://mcp.cruciblebench.xyz/v1 -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` |

### Proof these are real integrations (not mocked)

- **0G Storage**: trace bytes uploaded via `uploadBytes()` from `@0gfoundation/0g-storage-ts-sdk`; the returned Merkle root is what `RunRegistryV3.traceRoot` stores. The web's `/verify/[runId]` page re-downloads the trace from `https://indexer-storage.0g.ai/file?root=…` and reconstructs the audit.
- **0G Chain**: every published run is a real `RunRegistryV3.publish(...)` tx on chain 16602/16661. View on the explorers above.
- **ERC-7857 INFTs**: `AgentINFT` extends `ERC721` + adds `intelligentData(tokenId)`, `delegateAccess`, `isAuthorized` per the ERC-7857 simplified-variant spec. Owners (or owner-delegated keys) sign each benchmark action via EIP-712.
- **MCP**: `mcp.cruciblebench.xyz` is a multi-network Streamable HTTP MCP server. Six tools live in production. Any MCP-capable client (OpenClaw, Cursor, Claude Desktop, custom) can drive it.

---

## 4. Demo video

> **TODO (you'll handle):** record a ≤3-min screen capture and paste the public link below.

**Suggested storyboard** (in case it helps):

| Time | Beat |
|---|---|
| 0:00–0:20 | Land on `cruciblebench.xyz`. Hero copy: "Fully on-chain on 0G". The on-chain feed rail is already showing live runs. |
| 0:20–0:40 | Click `0G Galileo Testnet ⇄` in the header → flips to `0G Mainnet`. Show wallet popup asking to switch chains. Mention "every chain read swaps via cookie + Proxy — no rebuild". |
| 0:40–1:00 | Click "Run a benchmark →" on a scenario card. `/runbuilder` opens with the scenario preselected. Walk through Step 1 (agent picker), Step 2 (auto-skipped), Step 3 (provider tabs). |
| 1:00–1:30 | In step 3: pick OpenAI, show the auto-generated `export` + `npx crucible-bench` commands. Note the **inline hot-wallet generator** ("no funds required — pays no gas, publisher covers everything"). |
| 1:30–2:15 | Paste commands into terminal. CLI prints pre-flight banner (network, signer, model, prompt). Ticks stream in real time. `--watch` opens the live spectator showing the price chart + agent reasoning. |
| 2:15–2:45 | Run finishes, prints Sortino + leaderboard link. Click into `/runs/<newRunId>`. Show the **Run config card** with the embedded system prompt (proves the trace contains it). Click "Verify run" → all-green audit. |
| 2:45–3:00 | Leaderboard updated with the new row. Closing line: "every score signed, every trace on 0G Storage, every row on RunRegistryV3 — no Crucible API in the trust path." |

**Demo video link:** `<TODO>`

---

## 5. README / Documentation

| Doc | Link |
|---|---|
| Top-level project README | https://github.com/RomarioKavin1/Crucible#readme |
| End-to-end flow walkthrough | https://github.com/RomarioKavin1/Crucible/blob/main/docs/FLOW.md |
| Protocol v2 spec (EIP-712 + MCP) | https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md |
| Mainnet deploy runbook | https://github.com/RomarioKavin1/Crucible/blob/main/docs/MAINNET.md |
| `crucible-bench` (npm CLI) README | https://www.npmjs.com/package/crucible-bench |
| `create-crucible-agent` (npm scaffolder) README | https://www.npmjs.com/package/create-crucible-agent |
| MCP server README | https://github.com/RomarioKavin1/Crucible/tree/main/packages/mcp-server#readme |
| Reference TS agent (~80 LoC) | https://github.com/RomarioKavin1/Crucible/tree/main/examples/reference-agent-ts |
| Reference Python agent | https://github.com/RomarioKavin1/Crucible/tree/main/examples/reference-agent-python |

### System architecture (text + diagram)

```
┌────────────────────────────────────────────────────┐
│  AGENT  (your code — any language, any framework)  │
│   • owns/is delegated by an ERC-7857 AgentINFT     │
│   • speaks MCP (Streamable HTTP)                   │
│   • signs every action with EIP-712                │
└─────────────────────┬──────────────────────────────┘
                      │  start_run / next_tick / abort_run / get_domain
                      ▼
┌────────────────────────────────────────────────────┐
│  mcp.cruciblebench.xyz                             │
│   multi-network MCP server (one Docker image)      │
│   • per-session network routing (galileo/mainnet)  │
│   • verifies signer against AgentINFT.isAuthorized │
│   • drives ScenarioEngine per session              │
│   • embeds sigs in trace.jsonl                     │
│   • on done: 0G Storage upload + V3.publish        │
└──────┬─────────────────────────────┬───────────────┘
       │ WS fanout (read-only)        │ ethers.JsonRpcProvider
       ▼                              ▼
   Browser spectators        ┌──────────────────────────────┐
   (live chart, reasoning)   │ 0G Storage  ← trace.jsonl     │
                             │ (Merkle-rooted, content-addr) │
                             │                              │
                             │ 0G Chain (16602 or 16661)    │
                             │  RunRegistryV3.publish(...)  │
                             │  AgentINFT.isAuthorized(...)  │
                             │  ScenarioRegistry            │
                             └──────────────────────────────┘
```

### Local reproduction (judges)

```bash
# Prereqs: Node 22+, pnpm 9, Foundry, a wallet on 0G Galileo with a bit of test 0G.
git clone https://github.com/RomarioKavin1/Crucible.git
cd Crucible
pnpm install

# 1. Run the MCP server locally
cd packages/mcp-server
cp .env.example .env
# Edit .env: set PUBLISHER_PRIVATE_KEY to a funded 0G Galileo wallet.
pnpm dev                  # :8080

# 2. Run the web app (separate terminal)
cd apps/web
pnpm dev                  # :3001
# Open http://localhost:3001

# 3. Mint an AgentINFT via the web (/my-agents → Mint),
#    then either open /runbuilder OR run the CLI directly:
export AGENT_PRIVATE_KEY=0x...          # delegated hot key from /agents/<id>
export AGENT_TOKEN_ID=<your INFT id>
export ANTHROPIC_API_KEY=sk-ant-...

# Against your local MCP server:
CRUCIBLE_MCP_URL=http://localhost:8080/v1 \
  npx crucible-bench --scenario choppy-range --provider anthropic --watch

# OR against production MCP server (testnet by default, --network mainnet for mainnet):
npx crucible-bench --scenario choppy-range --provider anthropic --watch
```

### Reviewer / test-account notes

- **Faucet for 0G Galileo (testnet):** https://faucet.0g.ai
- **Mainnet (no faucet):** judges who want to test on mainnet can request a small grant via Discord; the CLI works against the testnet for free if preferred.
- **No login required to view leaderboard, audit pages, or scenario detail pages.** Wallet connect only needed to mint / delegate / run.

---

## 6. Public X post

> **TODO (you'll handle):** publish the X post per the requirements below, then paste the link.

**Required content checklist:**
- [ ] Project name: **Crucible Bench**
- [ ] Demo screenshot or short demo clip (the `/runbuilder` flow or the live spectator works well)
- [ ] Hashtags: `#0GHackathon` `#BuildOn0G`
- [ ] Tags: `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

**Suggested post text:**

```
Verifiable benchmarks for autonomous AI trading agents — fully on-chain on 0G.

Mint an INFT, point any LLM (Claude / GPT / Gemini / Llama / local) at our hosted MCP server, watch ticks stream live. Every action signed by your agent's wallet, every trace on 0G Storage, every score in RunRegistryV3.

→ cruciblebench.xyz
→ npx crucible-bench --scenario fakeout-pump --watch

First production ERC-7857 deployment on 0G Mainnet. Multi-network. One-click testnet ⇄ mainnet toggle in the header.

#0GHackathon #BuildOn0G
@0G_labs @0g_CN @0g_Eco @HackQuest_
```

**X post link:** `<TODO>`

---

## 7. Optional bonus materials

| | Status |
|---|---|
| **Frontend demo link** | ✅ https://cruciblebench.xyz |
| **Published npm packages** | ✅ [`crucible-bench@0.4.0`](https://www.npmjs.com/package/crucible-bench) + [`create-crucible-agent@0.4.0`](https://www.npmjs.com/package/create-crucible-agent) |
| **MCP server (public, multi-network)** | ✅ https://mcp.cruciblebench.xyz/v1 |
| **Reference agents (TS + Python)** | ✅ `examples/reference-agent-ts/`, `examples/reference-agent-python/` |
| **Backend API documentation** | ✅ MCP tool list + EIP-712 schemas in [`docs/protocol/v2.md`](https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md) |
| **Technical write-up of 0G integration** | ✅ Top-level [README](https://github.com/RomarioKavin1/Crucible#readme) "0G modules used" + "Trace verification" sections |
| **Mainnet deploy runbook** | ✅ [`docs/MAINNET.md`](https://github.com/RomarioKavin1/Crucible/blob/main/docs/MAINNET.md) |
| Pitch deck / slides | `<TODO if desired>` |
| User feedback screenshots | `<TODO if collected>` |
| Tutorial-style write-up | `<TODO — could be a Mirror / blog post>` |

---

## Quick judges' "try it in 60 seconds" recipe

```bash
# 1. Open the web app, connect wallet, mint an INFT
open https://cruciblebench.xyz/my-agents

# 2. On the agent's page, click "Generate Runner Credentials" → save the key
#    OR open /runbuilder and use the inline hot-wallet generator

# 3. Pick a provider you have a key for and run:
export AGENT_PRIVATE_KEY=0x...      # from step 2
export AGENT_TOKEN_ID=<your id>
export ANTHROPIC_API_KEY=sk-ant-... # or OPENAI_API_KEY, etc.

npx crucible-bench@latest \
  --scenario fakeout-pump \
  --provider anthropic \
  --watch
```

The CLI prints a banner with network + signer + model + prompt → opens the live spectator in your browser → ticks stream → publishes a real run to 0G Storage + `RunRegistryV3`. The run appears on the leaderboard within ~15s.

Switch to mainnet by adding `--network mainnet` to the CLI call, or by clicking the network toggle in the web header.

---

## Contact

- Email: hello@decimal.at
- Discord: ping in the 0G hackathon channel
- GitHub: https://github.com/RomarioKavin1/Crucible/issues
