#!/usr/bin/env bash
# scripts/deploy-mainnet.sh
#
# One-shot 0G Mainnet deployment for the v3 stack.
# Walks through:
#   1. Deploy ScenarioRegistry + AgentINFT + RunRegistryV3
#   2. Print addresses to paste into contracts/deployed-addresses.json
#   3. Reminder of env vars to flip on Vercel + Railway
#
# Prerequisites (set in contracts/.env or current shell):
#   DEPLOYER_PRIVATE_KEY  — funded wallet on 0G Mainnet
#   OG_MAINNET_RPC        — defaults to https://evmrpc.0g.ai
#
# Usage:
#   ./scripts/deploy-mainnet.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

# Load env from contracts/.env if present
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

: "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY not set (put it in contracts/.env)}"
export OG_MAINNET_RPC="${OG_MAINNET_RPC:-https://evmrpc.0g.ai}"

echo "▸ Deploying RunRegistryV3 + AgentINFT + ScenarioRegistry to 0G Mainnet (chain 16601)..."
forge script script/DeployV3Mainnet.s.sol \
  --rpc-url mainnet \
  --broadcast \
  --legacy \
  --gas-price 3000000000 \
  --private-key "$DEPLOYER_PRIVATE_KEY"

echo ""
echo "✓ Done. Next steps:"
echo ""
echo "  1. Paste the addresses printed above into contracts/deployed-addresses.json"
echo "     under both \`mainnet\` and \`mainnetV2\` keys."
echo ""
echo "  2. Verify the file looks right:"
echo "     cat contracts/deployed-addresses.json"
echo ""
echo "  3. Flip env vars and redeploy:"
echo ""
echo "     # Vercel (web app)"
echo "     vercel env rm  NEXT_PUBLIC_OG_NETWORK production"
echo "     vercel env add NEXT_PUBLIC_OG_NETWORK production  # value: mainnet"
echo ""
echo "     # Railway (MCP server)"
echo "     railway variables set NETWORK=mainnet"
echo ""
echo "  4. Trigger redeploys:"
echo "     git push                # Vercel auto-deploys from main"
echo "     railway up              # or push, depending on Railway setup"
echo ""
echo "  5. Smoke-test: visit cruciblebench.xyz — header pill should read \"0G Mainnet · 16601\"."
