// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentINFT} from "../src/AgentINFT.sol";

contract AgentINFTTest is Test {
    AgentINFT inft;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B); // used in Tasks 2-4 delegation tests

    function setUp() public {
        inft = new AgentINFT();
    }

    function test_MintAssignsSequentialIds() public {
        vm.startPrank(alice);
        uint256 a = inft.mint("Momentum trader v1", keccak256("brain-v1"));
        uint256 b = inft.mint("Mean-reversion v1", keccak256("brain-v2"));
        vm.stopPrank();
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(inft.ownerOf(1), alice);
        assertEq(inft.ownerOf(2), alice);
        assertEq(inft.balanceOf(alice), 2);
    }

    function test_IntelligentDataReadable() public {
        vm.prank(alice);
        uint256 id = inft.mint("Momentum trader v1", keccak256("brain-v1"));
        (string memory desc, bytes32 h) = inft.intelligentData(id);
        assertEq(desc, "Momentum trader v1");
        assertEq(h, keccak256("brain-v1"));
    }

    function test_NameAndSymbol() public view {
        assertEq(inft.name(), "Crucible Agent INFT");
        assertEq(inft.symbol(), "CAINFT");
    }

    function test_OwnerOfRevertsForUnknownToken() public {
        vm.expectRevert(AgentINFT.TokenDoesNotExist.selector);
        inft.ownerOf(999);
    }

    function test_IntelligentDataRevertsForUnknownToken() public {
        vm.expectRevert(AgentINFT.TokenDoesNotExist.selector);
        inft.intelligentData(999);
    }
}
