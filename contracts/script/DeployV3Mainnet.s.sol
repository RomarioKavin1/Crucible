// contracts/script/DeployV3Mainnet.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentINFT} from "../src/AgentINFT.sol";
import {RunRegistryV3} from "../src/RunRegistryV3.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";

/// @notice Deploys the v3 stack on 0G Mainnet (chain id 16601):
///   - ScenarioRegistry (fresh, no v1 to share with)
///   - AgentINFT
///   - RunRegistryV3 (with the deployer auto-trusted as attester)
///
/// After running, paste the printed addresses into:
///   contracts/deployed-addresses.json under `mainnet` and `mainnetV2`.
///
/// Usage:
///   set -a && source .env && set +a
///   forge script script/DeployV3Mainnet.s.sol \
///     --rpc-url mainnet \
///     --broadcast \
///     --legacy \
///     --gas-price 3000000000 \
///     --private-key "$DEPLOYER_PRIVATE_KEY"
contract DeployV3Mainnet is Script {
    function run() external {
        // Prefer MAINNET_DEPLOYER_PRIVATE_KEY when present so testnet keys are
        // never used by accident. Falls back to DEPLOYER_PRIVATE_KEY for setups
        // that use the same wallet for both networks.
        uint256 pk = vm.envOr("MAINNET_DEPLOYER_PRIVATE_KEY", uint256(0));
        if (pk == 0) pk = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(pk);

        ScenarioRegistry scenarioReg = new ScenarioRegistry();
        AgentINFT inft = new AgentINFT();
        RunRegistryV3 runReg = new RunRegistryV3(address(inft));

        // The MCP server's PUBLISHER_PRIVATE_KEY (currently the same wallet
        // as DEPLOYER_PRIVATE_KEY on testnet) needs to be a trustedAttester.
        // The deployer is auto-trusted via the V3 constructor; if the publisher
        // is a different address, set PUBLISHER_PUBLIC and it'll be trusted too.
        try vm.envAddress("PUBLISHER_PUBLIC") returns (address publisher) {
            if (publisher != address(0)) {
                runReg.setTrustedAttester(publisher, true);
            }
        } catch { /* optional */ }

        vm.stopBroadcast();

        console.log("=== Mainnet deployment ===");
        console.log("ScenarioRegistry: ", address(scenarioReg));
        console.log("AgentINFT:        ", address(inft));
        console.log("RunRegistryV3:    ", address(runReg));
        console.log("");
        console.log("Paste into contracts/deployed-addresses.json:");
        console.log("  mainnet.ScenarioRegistry = above");
        console.log("  mainnetV2.ScenarioRegistry = above");
        console.log("  mainnetV2.AgentINFT = above");
        console.log("  mainnetV2.RunRegistryV3 = above");
    }
}
