// contracts/script/DeployV2Testnet.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentINFT} from "../src/AgentINFT.sol";
import {RunRegistryV2} from "../src/RunRegistryV2.sol";

contract DeployV2Testnet is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        AgentINFT inft = new AgentINFT();
        RunRegistryV2 runReg = new RunRegistryV2(address(inft));

        vm.stopBroadcast();

        console.log("AgentINFT:      ", address(inft));
        console.log("RunRegistryV2:  ", address(runReg));
    }
}
