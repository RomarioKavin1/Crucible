// contracts/script/DeployV3Testnet.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {RunRegistryV3} from "../src/RunRegistryV3.sol";

/// @notice Deploys only RunRegistryV3, reusing the existing AgentINFT
///         (because INFTs are long-lived identity — only the run registry needs the model fields).
contract DeployV3Testnet is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentInft = vm.envAddress("AGENT_INFT_ADDRESS");

        vm.startBroadcast(pk);
        RunRegistryV3 runReg = new RunRegistryV3(agentInft);
        // Auto-trust the publisher key (the MCP server's auto-publisher).
        // PUBLISHER_PUBLIC must be the address that corresponds to PUBLISHER_PRIVATE_KEY in the MCP env.
        try vm.envAddress("PUBLISHER_PUBLIC") returns (address publisher) {
            if (publisher != address(0)) {
                runReg.setTrustedAttester(publisher, true);
            }
        } catch { /* optional — only set if env present */ }
        vm.stopBroadcast();

        console.log("RunRegistryV3:  ", address(runReg));
    }
}
