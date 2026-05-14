// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {RunRegistry} from "../src/RunRegistry.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RunRegistryTest is Test {
    AgentRegistry agents;
    RunRegistry runs;
    address owner   = address(this);
    address alice   = address(0xA11CE);

    function setUp() public {
        agents = new AgentRegistry();
        runs = new RunRegistry(address(agents));
        runs.setTrustedAttester(owner, true);
    }

    function _mintAndSetRecipe(address user, bytes32 recipeHash) internal returns (uint256) {
        vm.prank(user);
        uint256 id = agents.mintAgent("meta");
        vm.prank(user);
        agents.updateRecipe(id, recipeHash);
        return id;
    }

    function test_RecordRunHappyPath() public {
        bytes32 r = keccak256("recipe");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        uint256 runId = runs.recordRun(
            agentId, bytes32("eth"), r, keccak256("trace"), int256(310000), int256(-121000), int256(-184000), ""
        );
        assertEq(runId, 0);
        assertEq(runs.totalRuns(), 1);
        assertEq(runs.getRunsByAgent(agentId).length, 1);
        assertEq(runs.getRunsByScenario(bytes32("eth")).length, 1);
    }

    function test_UntrustedAttesterReverts() public {
        bytes32 r = keccak256("recipe");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        vm.prank(alice); // alice is not a trusted attester
        vm.expectRevert(RunRegistry.UntrustedAttester.selector);
        runs.recordRun(agentId, bytes32("eth"), r, keccak256("t"), 0, 0, 0, "");
    }

    function test_RecipeMismatchReverts() public {
        bytes32 r1 = keccak256("recipe-1");
        bytes32 r2 = keccak256("recipe-2");
        uint256 agentId = _mintAndSetRecipe(alice, r1);
        vm.expectRevert(RunRegistry.RecipeMismatch.selector);
        runs.recordRun(agentId, bytes32("eth"), r2, keccak256("t"), 0, 0, 0, "");
    }

    function test_OwnerCanGrantAttester() public {
        runs.setTrustedAttester(alice, true);
        bytes32 r = keccak256("r");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        vm.prank(alice);
        runs.recordRun(agentId, bytes32("e"), r, keccak256("t"), 0, 0, 0, "");
        assertEq(runs.totalRuns(), 1);
    }
}
