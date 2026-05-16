#!/usr/bin/env bash
# scripts/deploy-mainnet.sh
#
# One-shot 0G Mainnet deployment for the v3 stack.
# Walks through:
#   1. Deploy ScenarioRegistry + AgentINFT + RunRegistryV3
#   2. Auto-trust the publisher wallet so the MCP server can call publish(...)
#   3. Print addresses to paste into contracts/deployed-addresses.json
#   4. Reminder of env vars to flip on Vercel + Railway
#
# Required env (set in contracts/.env or current shell):
#   MAINNET_DEPLOYER_PRIVATE_KEY    — funded wallet on 0G Mainnet (deploys contracts)
#   MAINNET_PUBLISHER_PRIVATE_KEY   — funded wallet on 0G Mainnet (MCP server publishes runs).
#                                     If unset, only the deployer is auto-trusted; the
#                                     publisher will fail to call publish() until added via
#                                     setTrustedAttester().
# Optional fallbacks (for setups that reuse the same wallet across networks):
#   DEPLOYER_PRIVATE_KEY            — used if MAINNET_DEPLOYER_PRIVATE_KEY is absent
#   OG_MAINNET_RPC                  — defaults to https://evmrpc.0g.ai
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

# ─── Resolve deployer key ─────────────────────────────────────────────────────
DEPLOYER_KEY="${MAINNET_DEPLOYER_PRIVATE_KEY:-${DEPLOYER_PRIVATE_KEY:-}}"
if [[ -z "$DEPLOYER_KEY" ]]; then
  echo "✗ Need MAINNET_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) in contracts/.env" >&2
  exit 1
fi

# ─── Resolve publisher address (so it can be auto-trusted on deploy) ─────────
if [[ -n "${MAINNET_PUBLISHER_PRIVATE_KEY:-}" ]]; then
  if command -v cast >/dev/null 2>&1; then
    PUBLISHER_PUBLIC=$(cast wallet address --private-key "$MAINNET_PUBLISHER_PRIVATE_KEY")
    export PUBLISHER_PUBLIC
    echo "▸ Will auto-trust publisher: $PUBLISHER_PUBLIC"
  else
    echo "⚠ 'cast' not on PATH — publisher won't be auto-trusted. Set PUBLISHER_PUBLIC manually." >&2
  fi
elif [[ -n "${PUBLISHER_PUBLIC:-}" ]]; then
  echo "▸ Will auto-trust publisher: $PUBLISHER_PUBLIC"
else
  echo "⚠ No MAINNET_PUBLISHER_PRIVATE_KEY or PUBLISHER_PUBLIC set." >&2
  echo "   Only the deployer will be a trustedAttester. The MCP server's mainnet" >&2
  echo "   publisher will fail to call publish() until added via setTrustedAttester()." >&2
fi

# Foundry script reads MAINNET_DEPLOYER_PRIVATE_KEY (with DEPLOYER_PRIVATE_KEY fallback)
export MAINNET_DEPLOYER_PRIVATE_KEY="$DEPLOYER_KEY"
export OG_MAINNET_RPC="${OG_MAINNET_RPC:-https://evmrpc.0g.ai}"

echo ""
echo "▸ Deploying RunRegistryV3 + AgentINFT + ScenarioRegistry to 0G Mainnet (chain 16661)..."
forge script script/DeployV3Mainnet.s.sol \
  --rpc-url mainnet \
  --broadcast \
  --legacy \
  --gas-price 3000000000 \
  --private-key "$DEPLOYER_KEY"

echo ""
echo "✓ Done. Next steps:"
echo ""
echo "  1. Paste the addresses printed above into contracts/deployed-addresses.json"
echo "     under both \`mainnet\` and \`mainnetV2\` keys."
echo ""
echo "  2. Verify the file looks right:"
echo "     cat contracts/deployed-addresses.json"
echo ""
echo "  3. Update Railway with the mainnet publisher key + network:"
echo "     railway variables --set NETWORK=mainnet \\"
echo "                       --set PUBLISHER_PRIVATE_KEY=\$MAINNET_PUBLISHER_PRIVATE_KEY"
echo ""
echo "  4. Update Vercel with the mainnet network flag:"
echo "     vercel env rm  NEXT_PUBLIC_OG_NETWORK production"
echo "     vercel env add NEXT_PUBLIC_OG_NETWORK production    # value: mainnet"
echo ""
echo "  5. Redeploy:"
echo "     railway up              # mcp-server"
echo "     git push                # web (Vercel auto-deploys from main)"
echo ""
echo "  6. Smoke-test: visit cruciblebench.xyz — header pill should read \"0G Mainnet · 16661\"."
