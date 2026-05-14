// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentINFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @title  RunRegistryV2 — append-only registry of completed runs (v2 INFT-attested)
/// @notice Each run is bound to an INFT tokenId. The agentINFT address is exposed
///         publicly so off-chain verifiers know which contract to query for
///         isAuthorized() when validating embedded trace signatures.
contract RunRegistryV2 {
    struct Run {
        uint256 tokenId;          // AgentINFT.tokenId of the agent
        bytes32 scenarioId;
        bytes32 traceRoot;        // 0G Storage root of trace.jsonl (with embedded sigs)
        bytes32 scorecardHash;    // sha256 of scorecard.json
        int256  scoreSortinoE6;
        int256  totalReturnE6;
        int256  maxDrawdownE6;
        uint64  timestamp;
        address recordedBy;
    }

    IAgentINFT public immutable agentINFT;
    address public owner;
    mapping(address => bool) public trustedAttester;

    Run[] private _runs;
    mapping(uint256 => uint256[]) private _runsByToken;
    mapping(bytes32 => uint256[]) private _runsByScenario;

    event RunPublished(
        uint256 indexed runId,
        uint256 indexed tokenId,
        bytes32 indexed scenarioId,
        bytes32 traceRoot,
        bytes32 scorecardHash,
        int256 scoreSortinoE6
    );
    event TrustedAttesterSet(address indexed attester, bool allowed);

    error NotOwner();
    error UntrustedAttester();

    constructor(address agentInftAddr) {
        agentINFT = IAgentINFT(agentInftAddr);
        owner = msg.sender;
        trustedAttester[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setTrustedAttester(address a, bool allowed) external onlyOwner {
        trustedAttester[a] = allowed;
        emit TrustedAttesterSet(a, allowed);
    }

    /// @dev runIds are 1-indexed (1, 2, 3, …); getRun(0) reverts.
    function publish(
        uint256 tokenId,
        bytes32 scenarioId,
        bytes32 traceRoot,
        bytes32 scorecardHash,
        int256  scoreSortinoE6,
        int256  totalReturnE6,
        int256  maxDrawdownE6
    ) external returns (uint256 runId) {
        if (!trustedAttester[msg.sender]) revert UntrustedAttester();
        // Existence check on the INFT — reverts with TokenDoesNotExist if unminted.
        agentINFT.ownerOf(tokenId);

        _runs.push(Run({
            tokenId: tokenId,
            scenarioId: scenarioId,
            traceRoot: traceRoot,
            scorecardHash: scorecardHash,
            scoreSortinoE6: scoreSortinoE6,
            totalReturnE6: totalReturnE6,
            maxDrawdownE6: maxDrawdownE6,
            timestamp: uint64(block.timestamp),
            recordedBy: msg.sender
        }));
        runId = _runs.length;
        _runsByToken[tokenId].push(runId);
        _runsByScenario[scenarioId].push(runId);

        emit RunPublished(runId, tokenId, scenarioId, traceRoot, scorecardHash, scoreSortinoE6);
    }

    function totalRuns() external view returns (uint256) {
        return _runs.length;
    }

    /// @dev runIds are 1-indexed (1, 2, 3, …); getRun(0) reverts.
    function getRun(uint256 runId) external view returns (Run memory) {
        return _runs[runId - 1];
    }

    function getRunsByToken(uint256 tokenId) external view returns (uint256[] memory) {
        return _runsByToken[tokenId];
    }

    function getRunsByScenario(bytes32 scenarioId) external view returns (uint256[] memory) {
        return _runsByScenario[scenarioId];
    }
}
