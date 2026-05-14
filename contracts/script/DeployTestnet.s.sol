// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RunRegistry} from "../src/RunRegistry.sol";

contract DeployTestnet is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        ScenarioRegistry scenarioReg = new ScenarioRegistry();
        AgentRegistry agentReg = new AgentRegistry();
        RunRegistry runReg = new RunRegistry(address(agentReg));

        vm.stopBroadcast();

        console.log("ScenarioRegistry:", address(scenarioReg));
        console.log("AgentRegistry:   ", address(agentReg));
        console.log("RunRegistry:     ", address(runReg));
    }
}
