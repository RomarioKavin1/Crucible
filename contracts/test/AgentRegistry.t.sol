// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry reg;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        reg = new AgentRegistry();
    }

    function test_MintAssignsId() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("ipfs://meta1");
        assertEq(id, 1);
        assertEq(reg.ownerOf(1), alice);
        assertEq(reg.balanceOf(alice), 1);
    }

    function test_MintIncrements() public {
        vm.startPrank(alice);
        uint256 id1 = reg.mintAgent("a");
        uint256 id2 = reg.mintAgent("b");
        assertEq(id1, 1);
        assertEq(id2, 2);
        vm.stopPrank();
    }

    function test_OwnerCanUpdateRecipe() public {
        vm.startPrank(alice);
        uint256 id = reg.mintAgent("a");
        bytes32 r1 = keccak256("recipe-v1");
        reg.updateRecipe(id, r1);
        assertEq(reg.getCurrentRecipe(id), r1);
        bytes32[] memory hist = reg.getRecipeHistory(id);
        assertEq(hist.length, 1);
        vm.stopPrank();
    }

    function test_NonOwnerCannotUpdateRecipe() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("a");
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        reg.updateRecipe(id, keccak256("r"));
    }

    function test_RecipeHistoryGrows() public {
        vm.startPrank(alice);
        uint256 id = reg.mintAgent("a");
        reg.updateRecipe(id, keccak256("r1"));
        reg.updateRecipe(id, keccak256("r2"));
        reg.updateRecipe(id, keccak256("r3"));
        bytes32[] memory hist = reg.getRecipeHistory(id);
        assertEq(hist.length, 3);
        assertEq(hist[2], keccak256("r3"));
        vm.stopPrank();
    }

    function test_Transfer() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("a");
        vm.prank(alice);
        reg.transferFrom(alice, bob, id);
        assertEq(reg.ownerOf(id), bob);
    }
}
