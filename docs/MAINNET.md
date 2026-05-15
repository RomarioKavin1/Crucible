# Mainnet Deployment Runbook

The frontend, MCP server, and contracts are all already wired for mainnet.
The system is **galileo-by-default**; switching to mainnet is a one-step
env flip per service after the contracts are deployed.

## Step-by-step

### 1. Deploy contracts

```bash
./scripts/deploy-mainnet.sh
```

This runs `forge script script/DeployV3Mainnet.s.sol` against `https://evmrpc.0g.ai`
and prints three addresses: `ScenarioRegistry`, `AgentINFT`, `RunRegistryV3`.

### 2. Paste addresses

Edit `contracts/deployed-addresses.json`. The `mainnet` and `mainnetV2` keys
are already stubbed — fill them in:

```json
{
  "mainnet": {
    "ScenarioRegistry": "0x…",
    "AgentRegistry":    "",
    "RunRegistry":      ""
  },
  "mainnetV2": {
    "ScenarioRegistry": "0x…",
    "AgentINFT":        "0x…",
    "RunRegistryV2":    "",
    "RunRegistryV3":    "0x…"
  }
}
```

The frontend reads this file at build time. **Until `mainnetV2.RunRegistryV3`
is non-empty, `isMainnetReady()` returns `false` and the frontend silently
falls back to galileo even if `NEXT_PUBLIC_OG_NETWORK=mainnet`** — so it's
safe to flip the env var first if you want.

### 3. Flip env vars

**Vercel** (web app):
```bash
vercel env rm  NEXT_PUBLIC_OG_NETWORK production
vercel env add NEXT_PUBLIC_OG_NETWORK production   # value: mainnet
```

**Railway** (MCP server):
```bash
railway variables set NETWORK=mainnet
```

### 4. Redeploy

```bash
git push                       # Vercel auto-redeploys
railway up                     # or push to your Railway service
```

### 5. Smoke-test

Visit `https://cruciblebench.xyz`. The header chain pill should read
`0G Mainnet · 16601` (cyan dot, no glow). The footer's "Network" column
should link to `chainscan.0g.ai`. The Run Scenario modal should show the
new chain id everywhere it surfaces.

## Architecture

The whole network selection lives in **one file**: `apps/web/lib/network.ts`.
Any module that needs an explorer URL, storage gateway, RPC endpoint, or
chain id imports from there:

```ts
import { CURRENT_NETWORK, explorerAddress, explorerTx, storageDownload } from "@/lib/network";
```

`CURRENT_NETWORK` is the active network's metadata; the helpers compose
the right URL for the active network. There are **no hardcoded
`chainscan-galileo.0g.ai` or `indexer-storage-testnet-turbo.0g.ai` strings
anywhere in the app** — `grep -r chainscan-galileo apps/web/app apps/web/components`
should return nothing post-deploy.

`apps/web/lib/contracts.ts` automatically reads from the right `<network>V2`
key in `deployed-addresses.json`, and `apps/web/lib/chain.ts` builds the
`@crucible/og-client` ChainConfig the same way.

`apps/web/lib/wagmi.ts` exposes both chains in the wagmi config so wallets
can switch between them in their network picker.

## Rollback

If anything is wrong: flip `NEXT_PUBLIC_OG_NETWORK` back to `galileo` and
redeploy. The mainnet contracts stay on chain (free to read), but the
frontend will go back to reading from Galileo. Same for Railway with
`NETWORK=galileo`.

## What's NOT auto-switched

- **MCP server URL** — uses `NEXT_PUBLIC_MCP_URL` separately. If you run
  separate MCP instances per network, set this per-environment too.
- **Existing on-chain data** — V2/V3 testnet runs stay on testnet; they
  don't get migrated. Run `scripts/migrate-v2-to-v3.ts` against mainnet
  if you want to seed runs (you probably don't — fresh leaderboard is
  cleaner).
- **Migration script** — currently only knows about Galileo addresses.
  Update `RPC` + the `V2`/`V3` constants in `scripts/migrate-v2-to-v3.ts`
  if you want to use it on mainnet.
