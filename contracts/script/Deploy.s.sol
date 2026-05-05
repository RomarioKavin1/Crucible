// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RunRegistry} from "../src/RunRegistry.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        ScenarioRegistry sr = new ScenarioRegistry();
        AgentRegistry ar = new AgentRegistry();
        RunRegistry rr = new RunRegistry();
        vm.stopBroadcast();

        console2.log("ScenarioRegistry:", address(sr));
        console2.log("AgentRegistry:   ", address(ar));
        console2.log("RunRegistry:     ", address(rr));
    }
}
