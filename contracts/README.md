# Crucible Contracts

Three contracts, deployed to 0G Chain.

- `ScenarioRegistry` — maps scenarioId → contentHash of the scenario bundle on
  0G Storage. Owner-controlled writes, public reads.
- `AgentRegistry` — ERC-721 Agent IDs. Each agent NFT carries `currentRecipeHash`
  plus an event log of recipe history.
- `RunRegistry` — append-only record of every Compete-mode run.

## Build / test

```
forge build
forge test
```

## Deploy

```
forge script script/Deploy.s.sol --rpc-url $OG_MAINNET_RPC --broadcast
```
