# 0G APAC Hackathon — Full Brief

> Build the next generation of AI x Web3 applications on 0G's modular infrastructure.

**Source:** https://www.hackquest.io/hackathons/0G-APAC-Hackathon
**Host:** 0G
**Mode:** Online (with in-person Demo Day component)
**Total Prize Pool:** $150,000 USD
**Participants (at time of research):** 926+

---

## 1. Key Dates (all 2026)

| Milestone | Window |
|---|---|
| Registration | Mar 18 → May 16 |
| Online Checkpoint (progress update + early feedback) | Mar 25 → Apr 14 |
| Hong Kong Web3 Festival Mini Demo Day (in-person) | **Apr 22** |
| Final Submission Deadline | **May 16, 23:59 UTC+8** |
| Preliminary Review / Online Evaluation | May 16 → May 24 |
| Reward Announcement | **May 29** |

> The HK Demo Day live performance is explicitly called out as a key reference for UX/Demo Quality scoring.

---

## 2. Prize Structure

**Total: $150,000 USD** — Paid in **USDT + 0G Ecosystem Credits** (credits usable for 0G storage, compute, AI inference, and ecosystem services).

### Grand Prizes ($100,000)
- 🥇 **1st Place** — $45,000
- 🥈 **2nd Place** — $35,000
- 🥉 **3rd Place** — $20,000

### Excellence Awards ($37,000)
- 10 awards × $3,700 — most creative/promising projects outside the top 3

### Community Awards ($13,000)
- 10 awards × $1,300 — selected via Discord / X community voting

---

## 3. The Five Tracks

### Track 1 — Agentic Infrastructure & OpenClaw Lab
- **Focus:** Cognitive backbone and orchestration layers for autonomous intelligence
- **Scope:** Agent frameworks, specialized Skills, data-processing pipelines
- **Priority:** OpenClaw for orchestration + 0G Compute for fine-tuning/inference + 0G Storage for state persistence and long-context memory

### Track 2 — Agentic Trading Arena (Verifiable Finance)
- **Focus:** Transition from manual DeFi to autonomous, verifiable financial logic
- **Scope:** Intelligent yield optimizers, risk-management bots, AI-driven perpetual strategy agents
- **Key Innovation:** **Sealed Inference and TEE-based execution** for execution privacy + anti-front-running

### Track 3 — Agentic Economy & Autonomous Applications
- **Focus:** Financial and service layer for the AI era
- **Key Directions:**
  - **Financial Rails:** micropayments, automated billing, revenue-sharing
  - **AI Commerce & Social:** AI-driven marketplaces, SocialFi agents, Agent-as-a-Service
  - **Operational Tools:** self-custodial agent wallets, AI-governed DAO infrastructure

### Track 4 — Web 4.0 Open Innovation (The Wildcard)
- **Focus:** High-performance scaling for SocialFi, Gaming, DePIN
- **Scope:** Application teams that need 0G's decentralized storage at real-world scale

### Track 5 — Privacy & Sovereign Infrastructure
- **Focus:** Confidentiality rails and abstraction layers for a secure Web 4.0
- **Scope:** Privacy-preserving protocols, cross-chain fragmentation solutions, MEV-resistant infrastructure

---

## 4. Eligibility

- Open to **global developers**, with focus on APAC builders
- Solo builders or teams of **1–6 members**
- Best for developers, startup teams, and AI x Web3 builders with strong product/technical ideas
- New project, early MVP, or existing prototype further developed and **deployed on 0G during the hackathon**
- One participant may join only one team

---

## 5. Submission Requirements (ALL mandatory unless marked optional)

### 5.1 Basic Project Information
- Project name
- One-sentence description (≤30 words)
- Short summary covering: what it does, problem solved, which 0G components used

### 5.2 Code Repository
- Public GitHub repo (or shared with judges)
- Must show **substantial development progress during the hackathon period**
- Empty repos / placeholder repos / repos without meaningful commits **may be disqualified**

### 5.3 0G Integration Proof — *the hard gate*
- A **0G mainnet contract address**
- A **0G Explorer link** showing verifiable on-chain activity
- Clear proof at least one 0G core component is integrated
- Accepted components include: 0G Storage, 0G Compute, 0G Chain, Agent ID, privacy/secure execution features

> **Projects without actual 0G integration will be considered invalid.**

### 5.4 Demo Video
- ≤ 3 minutes
- Must show: core functionality, user flow/use case, how the 0G component is actually used
- **Slide-only / concept-only videos will not be accepted**
- Public link (YouTube or Loom)

### 5.5 README / Documentation (English or Chinese)
- Project overview
- System architecture diagram or technical description
- Which 0G modules are used + how they support the product
- Local deployment / reproduction steps for judges
- Test account details, faucet instructions, reviewer notes

### 5.6 Public X Post (mandatory and verified)
- At least one public project post on X
- Submit the post link through HackQuest
- Must include:
  - Project name
  - Demo screenshot or short demo clip
  - Hashtags: `#0GHackathon` `#BuildOn0G`
  - Tags: `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

### 5.7 Optional Bonus Materials (strengthen submission)
- Pitch deck or slides
- Frontend demo link
- User feedback screenshots
- User testing notes
- Backend API documentation
- Tutorial / technical write-up showing how the 0G integration works

---

## 6. Judging Criteria (5 axes)

1. **0G Technical Integration Depth & Innovation** — extent of 0G adoption, innovation against AI/on-chain pain points
2. **Technical Implementation & Completeness** — functional integrity, code quality, **mandatory on-chain deployment** (Explorer link / contract address)
3. **Product Value & Market Potential** — market fit, problem solving, user value, growth roadmap
4. **User Experience & Demo Quality** — UI/UX intuitiveness; clarity/persuasiveness of pitch and demo (HK Demo Day live perf is a key reference)
5. **Team Capability & Documentation** — team background, quality of open-source code and README

> At least one 0G component must be integrated into every valid submission. Projects that fail this requirement may be disqualified or receive major score deductions.

---

## 7. The 0G Stack — Module-by-Module

Docs root: https://docs.0g.ai/
Developer hub: https://docs.0g.ai/developer-hub/getting-started
Testnet: **Galileo** (EVM-compatible)

### 7.1 0G Chain — https://docs.0g.ai/concepts/chain
- Modular EVM-compatible L1 built for AI workloads
- **CometBFT** consensus (optimized) — **~11,000 TPS per shard**, **sub-second finality**
- Architecture decouples consensus and execution layers for independent upgradability
- **Ethereum/Solidity code works without changes** (existing dApps migrate cleanly)
- Roadmap: DAG-based consensus, shared security model
- **Use for:** any on-chain settlement, registries, marketplaces, AI-DAO logic

### 7.2 0G Storage — https://docs.0g.ai/concepts/storage
- Two-layer architecture:
  - **Log Layer** — immutable, append-only, cheap, large files (AI training data, archives, ML datasets, video/image, blockchain history)
  - **Key-Value Layer** — mutable, fast key-based retrieval (databases, user profiles, game state, collaborative documents)
- ~95% cheaper than AWS S3
- Instant retrieval (unlike IPFS / Filecoin)
- Supports both structured + unstructured data
- **Proof of Random Access (PoRA)** mining; 8 TB cap per mining range
- TypeScript + Go SDKs
- **Use for:** dataset hosting, AI agent memory, document storage, dynamic application state

### 7.3 0G Compute — https://docs.0g.ai/concepts/compute
- Decentralized GPU marketplace ("Uber for AI computing")
- ~90% cheaper than centralized clouds, pay-per-use
- Smart contract escrow; ZK-proof settlement (TEEML, OPML, ZKML supported)
- **Two integration paths:**
  - **Router (recommended)** — OpenAI-compatible API endpoint, single API key, unified balance, automatic provider failover. Best for **server-side apps, agents, prototypes**.
  - **Direct SDK** (`@0gfoundation/0g-compute-ts-sdk`) — per-provider sub-accounts, every request signed by your wallet. Best for **browser dApps with wallet signing or on-chain control**.
- Service types: **Chatbot** (GPT, DeepSeek, others), **Text-to-Image** (Stable Diffusion), **Speech-to-Text** (Whisper)
- Live catalog: pc.0g.ai (Advanced mode) or compute-marketplace.0g.ai
- Rate limits: 30 req/min per user, 5 burst, 5 concurrent
- **Use for:** any AI inference your app needs

### 7.4 TEE / Sealed Inference (Privacy)
Two verification modes inside 0G Compute:
- **TeeML** — AI model runs directly inside a Trusted Execution Environment; responses signed by the TEE's private key. Used for self-hosted models.
- **TeeTLS** — Broker runs inside a TEE and proxies to a centralized LLM over HTTPS. Captures the provider's TLS certificate fingerprint, hashes request + response, signs as routing proof using TEE-protected key. Conceptually like zkTLS but with stronger privacy.
- **Use for:** Track 2 (verifiable finance, anti-frontrunning), Track 5 (privacy infra), and any vertical with sensitive inference (medical, legal, trading).

### 7.5 0G DA — https://docs.0g.ai/concepts/da
- Infinitely scalable data availability layer
- VRF-selected DA nodes work in quorums; sample-based verification
- Demonstrated **50 Gbps throughput** on Galileo testnet
- Inherits Ethereum security via shared staking
- **Use for:** L2s, rollups, on-chain games, DeFi order books, RaaS platforms (Caldera, AltLayer), bridges

### 7.6 Agent ID
- Standard for tokenizing AI agent intelligence, memory, and behavior
- Encrypted metadata, interactive evolution, tradable ownership, composability
- **Use for:** identity layer for agent marketplaces, agent-NFT systems

### 7.7 Persistent Memory — *Coming Soon*
- Persistent memory system for AI Agents and long-context LLMs
- Cross-session "permanent memory" + ultra-large context windows
- ⚠️ Not yet shipped — don't make it a hard dependency

### 7.8 Privacy & Security (umbrella)
- TEE secure execution + AI Alignment Nodes (real-time monitoring of model drift, bias, anomalies)
- End-to-end privacy via Agent ID encrypted metadata + ownership proofs

---

## 8. About 0G

0G is a **modular infrastructure stack for AI x Web3 applications** — decentralized storage, scalable data availability, decentralized compute, persistent memory, agent identity, privacy-preserving execution. Designed for builders creating apps that need scale, speed, data persistence, verifiable compute, and secure execution across AI-native and on-chain use cases.

It positions itself as the first **decentralized AI Operating System (deAIOS)**.

---

## 9. Existing Project Gallery — What's Already Crowded

Sampling from the public gallery shows heavy concentration in these patterns. Pure copies are unlikely to win — differentiate.

| Category | Existing examples |
|---|---|
| AI agent marketplaces | AgentVault, SkillMint, 0g-skillcapsule |
| Agent memory / persistent context | NeuroVault, MemoChain, EIDOLON, 0G MemoryOS |
| On-chain dataset annotation / labelling | Heda, cascade-annote |
| Autonomous trading / yield / perp bots | Sentri, VeilSolver, Aegis (fiat onramp), 0G Sentinel |
| Document signing on Storage | 0g sign |
| Security infra & threat intel | Tenman Firewall, ThreatLens, ZeroVuln |
| RWA / DePIN | GridShare (P2P energy), MediChain (health), Orbit AI (orbital cloud), Sect8 (real estate) |
| AI-native commerce / payments | Coal (x402-based), Agentra |
| Prediction markets | PROPHET |

### Where the white space looks bigger
- **Track 2 (TEE / Sealed Inference verifiable finance)** is technically deep but underrepresented vs the flood of "agent memory" and "AI marketplace" projects.
- **Track 4 wildcard** — high-perf consumer apps (gaming, SocialFi) actually using 0G Storage at scale is less crowded than infra plays.
- **Vertical-specific agent products** (legal, supply chain, compliance, education) using Agent ID + Compute combos — gallery is mostly horizontal infra.
- **Strong UX / live demo quality** is rare among infra projects — the HK Demo Day weighting rewards this heavily.

---

## 10. Practical Build Defaults

| Need | Recommended choice |
|---|---|
| Server-side AI inference | 0G Compute **Router** (OpenAI-compatible, fastest integration) |
| Browser dApp with wallet-signed AI calls | 0G Compute **Direct SDK** |
| Agent memory / large blob / dataset storage | **0G Storage** — KV (mutable) for state, Log (append-only) for archives |
| Smart contract / settlement / registry | **0G Chain** — vanilla Solidity + Hardhat/Foundry |
| Privacy-sensitive inference (trading, medical, legal) | **TeeML** (self-hosted in TEE) or **TeeTLS** (TEE-proxied to centralized LLM) |
| Mandatory submission gate | Mainnet contract address + verifiable activity on **0G Explorer** |

---

## 11. Submission Checklist (final)

- [ ] Public GitHub repo with substantial commits during hackathon period
- [ ] 0G mainnet contract address deployed
- [ ] 0G Explorer link showing verifiable on-chain activity
- [ ] Demo video ≤ 3 min on YouTube/Loom showing real product flow
- [ ] README with overview, architecture diagram, 0G modules used, local deploy steps
- [ ] Public X post with `#0GHackathon` `#BuildOn0G` tagging `@0G_labs @0g_CN @0g_Eco @HackQuest_`
- [ ] Project name + ≤30-word description + problem/solution/0G components summary
- [ ] (Optional bonus) pitch deck, live frontend, user feedback, API docs, technical write-up
