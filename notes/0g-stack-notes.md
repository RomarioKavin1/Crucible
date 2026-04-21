# 0G Stack — Research Notes (Apr 21)

## What I'm actually going to use

- **0G Chain** — EVM. Vanilla Solidity + Foundry. Need: ScenarioRegistry,
  AgentRegistry (NFT for Agent ID), RunRegistry.
- **0G Storage** — TS SDK. Two layers:
  - Log = immutable. Use for scenario bundles + finished run traces.
  - KV = mutable. Use for agent recipes (per-agent versioned).
- **0G Compute Router** — OpenAI-compatible endpoint. Use for the AI Coach
  inference. Single API key, automatic provider failover. Easy win.
- **0G Compute / TeeML** — sealed execution. Use for Compete mode runs so
  scores are tamper-resistant. Risk: unknown DX, may eat days.

## What I'm NOT going to use (yet)

- 0G DA — overkill for this app.
- Persistent Memory — not shipped.
- AI Alignment Nodes — not relevant.

## Track positioning

Primary: Track 1 (Agentic Infra / OpenClaw) + Track 2 (Verifiable Finance).
Secondary: Track 5 (Privacy) via TEE attestation.

## Decision: monorepo

pnpm workspaces. Two apps (local + web), shared core/skills/ui-kit/og-client.

## Open

- OpenClaw integration details — need to read OpenClaw docs end-to-end.
- TEE pubkey distribution — placeholder: platform admin registers attesters.
- Scenario data — Binance aggTrades is free; news needs hand-curation.
