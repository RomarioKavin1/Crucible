# Galileo deploy notes (May 10)

Deployed all three contracts to 0G's Galileo testnet to shake out the gas
profile before we cut a mainnet release.

```
forge script script/Deploy.s.sol \
  --rpc-url $OG_GALILEO_RPC \
  --private-key $DEPLOYER_PK \
  --broadcast
```

Output (kept here for reference, NOT mainnet addresses):

- ScenarioRegistry: 0x6ad...  (galileo)
- AgentRegistry:    0x9c1...  (galileo)
- RunRegistry:      0x4e2...  (galileo)

Gas was unsurprising — RunRegistry.recordRun is the hot path and lands around
~85k gas. ecrecover dominates; not worth trying to optimize further before
mainnet.

Mainnet deploy is gated on TEE attester wiring (see below).
