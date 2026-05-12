// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";

contract ScenarioRegistryTest is Test {
    ScenarioRegistry registry;
    address owner = address(0x1);
    address other = address(0x2);

    function setUp() public {
        vm.prank(owner);
        registry = new ScenarioRegistry();
    }

    function test_OwnerCanPublish() public {
        vm.prank(owner);
        registry.publishScenario(
            bytes32("eth-tariff"),
            keccak256("content"),
            keccak256("storage-root"),
            "public"
        );
        ScenarioRegistry.Scenario memory s = registry.getScenario(bytes32("eth-tariff"));
        assertEq(s.contentHash, keccak256("content"));
    }

    function test_NonOwnerCannotPublish() public {
        vm.prank(other);
        vm.expectRevert(ScenarioRegistry.NotOwner.selector);
        registry.publishScenario(bytes32("x"), keccak256("c"), keccak256("s"), "public");
    }

    function test_DoublePublishReverts() public {
        vm.startPrank(owner);
        registry.publishScenario(bytes32("x"), keccak256("c"), keccak256("s"), "public");
        vm.expectRevert(ScenarioRegistry.AlreadyPublished.selector);
        registry.publishScenario(bytes32("x"), keccak256("c2"), keccak256("s2"), "public");
        vm.stopPrank();
    }

    function test_GetUnknownReverts() public {
        vm.expectRevert(ScenarioRegistry.NotFound.selector);
        registry.getScenario(bytes32("nope"));
    }

    function test_ListScenarioIds() public {
        vm.startPrank(owner);
        registry.publishScenario(bytes32("a"), keccak256("c"), keccak256("s"), "public");
        registry.publishScenario(bytes32("b"), keccak256("c"), keccak256("s"), "held_out");
        vm.stopPrank();
        bytes32[] memory ids = registry.listScenarioIds();
        assertEq(ids.length, 2);
    }
}
