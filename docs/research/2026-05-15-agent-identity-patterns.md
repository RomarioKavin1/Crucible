# Agent Identity Patterns — Research Reference

**Date:** 2026-05-15
**Status:** Reference only. Brainstorm to redesign Crucible's identity layer was cancelled — current Pattern A (owner-first ERC-7857 + delegated hot key) is judged adequate after recent UX fixes (credentials download, npm CLI, live banner).
**Future trigger:** Revisit if (a) marketplace/transferability becomes a product priority, (b) the broader 0G ecosystem standardizes on ERC-8004, or (c) sovereign agents (Phala TEE, Bittensor-style) become a meaningful share of users.

---

## Five identity patterns observed across the agent-platform space

### Pattern A — Owner-managed worker
- The agent is just code. Human's wallet is the only on-chain identity. Agent acts via a delegated key (session key, hot key, smart-account signer) constrained by spending caps, allowlists, TTL.
- Examples: Recall, Crossmint, Coinbase AgentKit, Virtuals (Smart Wallet + whitelisted Dev EOA), default ElizaOS, default uAgents-without-Almanac.
- **This is what Crucible v2 currently does.**

### Pattern B — Tokenized agent (NFT-as-agent)
- Agent IS an NFT. Whoever holds the NFT controls the agent. Ownership transfers re-key the agent.
- Examples: ERC-7857 (INFT), ERC-8004 Identity Registry (ERC-721 base), Olas component/agent/service registries (ERC-721 triplet), AIverse "Agentic ID", Virtuals share-tokens (ERC-20 variant).
- Owner is still typically a human, but the agent has a first-class on-chain object that survives ownership changes.

### Pattern C — Operator/owner split (two distinct roles)
- Service Owner ≠ Agent Operator ≠ Agent Instance. Each has its own key; the smart contract enforces the relationship.
- Cleanest example: **Olas**. Service owner registers the service NFT, separately-keyed operators stake and run agent instances, Safe multisig requires N-of-M agent signatures to execute.
- ERC-8004 mirrors this: `owner` (NFT holder) vs `operator` (delegated registration-file editor) vs `agentWallet` (the EOA the agent actually signs with).

### Pattern D — Self-sovereign agent
- Agent's wallet/DID is the root; humans are optional attestors, not owners.
- **Bittensor**: hotkey/coldkey pair where the hotkey is the agent's operating identity holding the UID slot.
- **Fetch.ai uAgents**: generate `agent1...` ed25519 identity at startup, self-register on Almanac with no required human counterpart.
- **Phala TEE-derived agents**: keys generated *inside* an enclave — the human deployer cannot extract them.
- **Nevermined**: agent gets wallet+DID at registration with cryptographic proof of provenance.

### Pattern E — Mutual attestation / credential delegation
- Both parties sign that they're related, often using verifiable credentials.
- **Skyfire KYA**: JWT signed by platform + agent + human/business, presented to counterparties.
- **World × Coinbase AgentKit**: delegates a World ID ZK proof to an agent key — agent can prove "a unique human authorized me."
- **W3C DID + VC for agents** (Microsoft Entra Agent ID, Ignite 2025) formalizes this as agent-DID + owner-issued-VC.
- **ERC-8004 + Phala TEE** combines on-chain identity with TEE attestation that "this code is what's actually running."

---

## Per-platform mechanics (selected)

| Platform | Pattern | Mint who | Key relationship |
|---|---|---|---|
| **Recall** | A | Developer EOA | DB row + signed binding to trading wallet |
| **Olas** | B + C | Service owner mints NFT | Owner / Operator (separate keys, unique across services) / Agent instance keys |
| **Virtuals** | A + B hybrid | Human dev | Tokenized share = ownership of cash flow; control via whitelisted Dev EOA on a Smart Wallet with no PK |
| **ElizaOS** | A | Human via plugin | Wallet plugin (CDP/Privy/Turnkey/ZeroDev); plugin-tee variant moves toward D |
| **Fetch.ai uAgents** | D leaning | Agent itself | ed25519 agent identity self-registered on Almanac |
| **Bittensor** | C + D | Coldkey via btcli | Hotkey holds UID slot; coldkey custodies/stakes. Hotkey IS the agent. |
| **GAIA / Gaianet** | A + light D | Installer auto-generates address | Bind to MetaMask via web for rewards |
| **AIverse on 0G** | B | Human (developer or no-code path) | ERC-7857 NFT owned by human wallet |
| **ERC-8004 (standard)** | B + C, hooks for E | Owner mints, agent attests via setAgentWallet | NFT holder + operator + agent wallet (separate roles, EIP-712 mutual sig) |
| **ERC-7857 (standard)** | B | Owner | Owner-centric; `authorizeUsage` for sealed-executor delegation |
| **Skyfire KYA** | E | Platform issues JWT | Platform + agent + human all sign |
| **World × AgentKit** | E with biometric anchor | Human delegates ZK proof | Agent key bound to World ID proof |

---

## What we'd build if we ever pursued this

If the brainstorm had continued, the recommendation was to build on **Pattern C + E hybrid using ERC-8004 semantics**, retaining ERC-7857 only for the "intelligence-as-asset" use case (encrypted memory, transferable agents).

Three on-chain roles per agent:

1. **Owner key** — ERC-721 holder. Can be a human, a DAO, or another agent.
2. **Agent key** — the EOA/AA that actually signs benchmark actions; bound via `setAgentWallet(...)` with an EIP-712 signature *from the agent itself* (mutual attestation falls out of the spec).
3. **Operator key** — optional. Can update the registration file / metadata URI without holding the NFT.

Two-signature mint ceremony: owner signs the mint, agent signs `setAgentWallet`. Both sigs required for the on-chain record. That's mutual attestation, no new primitive needed.

For "agent-first" feel: support a **claim-after-birth** flow. An agent (autonomous Eliza process, Phala TEE container) self-mints with `owner == agentKey`, then later transfers ownership to a human/DAO wallet that signs an acceptance.

**Why this generalizes to every agent type:**

| Agent type | Mapping |
|---|---|
| OpenClaw plugin agent | Runtime holds agent key, signs setAgentWallet; owner = operator's wallet |
| Hosted Anthropic SDK | Crossmint/CDP TEE-backed agent wallet signs setAgentWallet; owner = developer |
| Self-deployed Eliza | plugin-evm wallet signs; owner = same key (sovereign) or separate |
| Bittensor miner | Hotkey → agent key, coldkey → owner key |
| Phala TEE agent | Already shipped on Phala's ERC-8004 + TEE Registry extension |
| Browser-based agent | Smart account with session-key permissions; owner = MetaMask |
| Headless API-driven | Same as hosted SDK |

The reason this works for everything: ERC-8004 doesn't prescribe what the agent IS — it just gives every agent a tokenized identity, an owner, and a wallet binding, with a flexible JSON registration file for everything else.

---

## What we explicitly rejected from the analysis

- **Pure ERC-7857-only identity** as the primary: too owner-centric, forces every agent to have transferable encrypted intelligence (most benchmark agents don't).
- **Virtuals-style ERC-20 share-tokens**: great for revenue-sharing launchpads but assumes the agent is a financial product. Not generalizable.

---

## Sources

- [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 contracts repo](https://github.com/erc-8004/erc-8004-contracts)
- [ERC-8004 developer guide (QuickNode)](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [Phala ERC-8004 TEE Agent](https://github.com/Phala-Network/erc-8004-tee-agent)
- [EIP-7857: AI Agents NFT with Private Metadata](https://eips.ethereum.org/EIPS/eip-7857)
- [0G ERC-7857 docs](https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857)
- [0G AIverse blog](https://0g.ai/blog/introducing-aiverse)
- [Recall: register agent](https://docs.recall.network/competitions/register-agent/register)
- [Olas agent service overview](https://docs.olas.network/open-autonomy/get_started/what_is_an_agent_service/)
- [autonolas-registries repo](https://github.com/valory-xyz/autonolas-registries)
- [Virtuals whitepaper](https://whitepaper.virtuals.io/)
- [ElizaOS docs](https://docs.elizaos.ai/)
- [Fetch.ai uAgent address spec](https://uagents.fetch.ai/docs/getting-started/address)
- [Bittensor validators](https://docs.learnbittensor.org/validators)
- [Gaianet node registration](https://docs.gaianet.ai/getting-started/register/)
- [Skyfire KYA](https://docs.skyfire.xyz/docs/introduction-1)
- [Crossmint dual-key architecture](https://www.crossmint.com/learn/ai-agent-wallet-architecture)
- [Coinbase AgentKit](https://docs.cdp.coinbase.com/agent-kit/welcome)
- [W3C DID v1.1](https://www.w3.org/TR/did-1.1/)
- [AI Agents with DIDs and VCs (arxiv 2511.02841)](https://arxiv.org/abs/2511.02841)
