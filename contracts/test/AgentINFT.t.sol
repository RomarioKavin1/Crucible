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

    function test_OwnerCanDelegate() public {
        vm.prank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        address hot = address(0xC0FFEE);

        vm.prank(alice);
        inft.delegateAccess(id, hot);

        assertTrue(inft.isAuthorized(id, alice));   // owner always authorized
        assertTrue(inft.isAuthorized(id, hot));     // delegated assistant authorized
        assertFalse(inft.isAuthorized(id, bob));    // unrelated address not authorized

        address[] memory dels = inft.getDelegations(id);
        assertEq(dels.length, 1);
        assertEq(dels[0], hot);
    }

    function test_NonOwnerCannotDelegate() public {
        vm.prank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        vm.prank(bob);
        vm.expectRevert(AgentINFT.NotOwner.selector);
        inft.delegateAccess(id, address(0xC0FFEE));
    }

    function test_RevokeRemovesAuthorization() public {
        vm.startPrank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        address hot = address(0xC0FFEE);
        inft.delegateAccess(id, hot);
        inft.revokeAccess(id, hot);
        vm.stopPrank();

        assertFalse(inft.isAuthorized(id, hot));
        address[] memory dels = inft.getDelegations(id);
        assertEq(dels.length, 0);
    }

    function test_DuplicateDelegationIsNoop() public {
        vm.startPrank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        address hot = address(0xC0FFEE);
        inft.delegateAccess(id, hot);
        inft.delegateAccess(id, hot);  // duplicate — should not double-add
        vm.stopPrank();
        address[] memory dels = inft.getDelegations(id);
        assertEq(dels.length, 1);
    }

    function test_CannotDelegateZeroAddress() public {
        vm.prank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        vm.prank(alice);
        vm.expectRevert(AgentINFT.InvalidAssistant.selector);
        inft.delegateAccess(id, address(0));
    }

    function test_RevokeNonDelegateIsNoop() public {
        vm.prank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        vm.prank(alice);
        inft.revokeAccess(id, address(0xC0FFEE)); // never delegated — must not revert
        address[] memory dels = inft.getDelegations(id);
        assertEq(dels.length, 0);
    }

    function test_DelegationCapEnforced() public {
        vm.startPrank(alice);
        uint256 id = inft.mint("a", bytes32(0));
        for (uint256 i = 0; i < 100; i++) {
            inft.delegateAccess(id, address(uint160(0x1000 + i)));
        }
        vm.expectRevert(AgentINFT.DelegationCapReached.selector);
        inft.delegateAccess(id, address(uint160(0x9999)));
        vm.stopPrank();
    }

    function test_TokensOfReturnsAllOwned() public {
        vm.startPrank(alice);
        uint256 a = inft.mint("a", bytes32(0));
        uint256 b = inft.mint("b", bytes32(0));
        uint256 c = inft.mint("c", bytes32(0));
        vm.stopPrank();
        vm.prank(bob);
        uint256 d = inft.mint("d", bytes32(0));

        uint256[] memory aliceTokens = inft.tokensOf(alice);
        assertEq(aliceTokens.length, 3);
        assertEq(aliceTokens[0], a);
        assertEq(aliceTokens[1], b);
        assertEq(aliceTokens[2], c);

        uint256[] memory bobTokens = inft.tokensOf(bob);
        assertEq(bobTokens.length, 1);
        assertEq(bobTokens[0], d);

        uint256[] memory none = inft.tokensOf(address(0xDEAD));
        assertEq(none.length, 0);
    }
}
