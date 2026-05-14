// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentINFT} from "../src/AgentINFT.sol";
import {RunRegistryV2} from "../src/RunRegistryV2.sol";

contract RunRegistryV2Test is Test {
    AgentINFT inft;
    RunRegistryV2 reg;
    address publisher = address(0xCAFE);

    function setUp() public {
        inft = new AgentINFT();
        reg = new RunRegistryV2(address(inft));
        reg.setTrustedAttester(publisher, true);

        // Mint a generous block of tokenIds (1..42) so every publish() call below has
        // a real INFT to reference. The UntrustedCannotPublish test still proves guard
        // order — UntrustedAttester fires before agentINFT.ownerOf() is called, so the
        // test would pass even with no INFTs minted.
        for (uint256 i = 0; i < 9; i++) {
            inft.mint("agent", bytes32(i));
        }
        // After the loop tokenIds 1-9 exist; test_PublishRecordsRun uses 42 which
        // does NOT exist, but UntrustedAttester fires first... wait, publisher IS
        // trusted. Mint 42 explicitly.
        for (uint256 i = 10; i <= 42; i++) {
            inft.mint("agent", bytes32(i));
        }
    }

    function test_PublishRecordsRun() public {
        vm.prank(publisher);
        uint256 runId = reg.publish(
            42,                       // tokenId
            keccak256("choppy-range"),
            keccak256("trace"),
            keccak256("scorecard"),
            420000,                   // sortino e6
            150000,                   // totalReturn e6
            -30000                    // maxDD e6
        );
        assertEq(runId, 1);

        RunRegistryV2.Run memory r = reg.getRun(runId);
        assertEq(r.tokenId, 42);
        assertEq(r.scenarioId, keccak256("choppy-range"));
        assertEq(r.traceRoot, keccak256("trace"));
        assertEq(r.scorecardHash, keccak256("scorecard"));
        assertEq(r.scoreSortinoE6, 420000);
        assertEq(r.recordedBy, publisher);
        assertEq(reg.totalRuns(), 1);
    }

    function test_UntrustedCannotPublish() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(RunRegistryV2.UntrustedAttester.selector);
        reg.publish(1, bytes32(0), bytes32(0), bytes32(0), 0, 0, 0);
    }

    function test_RunsByTokenIndex() public {
        vm.startPrank(publisher);
        reg.publish(7, keccak256("s1"), keccak256("t1"), keccak256("sc1"), 1, 1, -1);
        reg.publish(7, keccak256("s2"), keccak256("t2"), keccak256("sc2"), 2, 2, -2);
        reg.publish(8, keccak256("s1"), keccak256("t3"), keccak256("sc3"), 3, 3, -3);
        vm.stopPrank();

        uint256[] memory ofSeven = reg.getRunsByToken(7);
        assertEq(ofSeven.length, 2);
        assertEq(ofSeven[0], 1);
        assertEq(ofSeven[1], 2);

        uint256[] memory ofEight = reg.getRunsByToken(8);
        assertEq(ofEight.length, 1);
        assertEq(ofEight[0], 3);
    }

    function test_RunsByScenarioIndex() public {
        vm.startPrank(publisher);
        reg.publish(7, keccak256("s1"), keccak256("t1"), keccak256("sc1"), 1, 1, -1);
        reg.publish(8, keccak256("s1"), keccak256("t2"), keccak256("sc2"), 2, 2, -2);
        reg.publish(9, keccak256("s2"), keccak256("t3"), keccak256("sc3"), 3, 3, -3);
        vm.stopPrank();

        uint256[] memory s1 = reg.getRunsByScenario(keccak256("s1"));
        assertEq(s1.length, 2);
    }

    function test_AgentInftAddressExposed() public view {
        assertEq(address(reg.agentINFT()), address(inft));
    }
}
