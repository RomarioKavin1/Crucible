// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getCurrentRecipe(uint256 agentId) external view returns (bytes32);
}

/// @notice Append-only registry of completed runs.
contract RunRegistry {
    struct Run {
        uint256 agentId;
        bytes32 scenarioId;
        bytes32 recipeHash;
        bytes32 traceHash;          // 0G Storage root hash for trace.jsonl
        int256  scoreSortinoE6;     // Sortino * 1e6 (signed fixed-point)
        int256  totalReturnE6;
        int256  maxDrawdownE6;      // negative
        uint64  timestamp;
        bytes   teeAttestation;     // optional opaque attestation blob
        address recordedBy;
    }

    IAgentRegistry public immutable agentRegistry;
    address public owner;
    mapping(address => bool) public trustedAttester; // v1: owner-controlled allowlist

    Run[] private runs;
    mapping(uint256 => uint256[]) private runsByAgent;
    mapping(bytes32 => uint256[]) private runsByScenario;

    event RunRecorded(
        uint256 indexed runId,
        uint256 indexed agentId,
        bytes32 indexed scenarioId,
        bytes32 recipeHash,
        bytes32 traceHash,
        int256 scoreSortinoE6
    );
    event TrustedAttesterSet(address indexed attester, bool allowed);

    error NotOwner();
    error UntrustedAttester();
    error RecipeMismatch();

    constructor(address agentRegistryAddr) {
        agentRegistry = IAgentRegistry(agentRegistryAddr);
        owner = msg.sender;
        trustedAttester[msg.sender] = true; // owner is implicitly trusted in v1
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setTrustedAttester(address a, bool allowed) external onlyOwner {
        trustedAttester[a] = allowed;
        emit TrustedAttesterSet(a, allowed);
    }

    /// @notice Record a Compete-mode run. v1 trust model: caller must be a trusted attester.
    function recordRun(
        uint256 agentId,
        bytes32 scenarioId,
        bytes32 recipeHash,
        bytes32 traceHash,
        int256  scoreSortinoE6,
        int256  totalReturnE6,
        int256  maxDrawdownE6,
        bytes calldata teeAttestation
    ) external returns (uint256 runId) {
        if (!trustedAttester[msg.sender]) revert UntrustedAttester();
        // Anti-tuning lock: recipeHash must match the agent's currently-on-chain recipe.
        bytes32 onchainRecipe = agentRegistry.getCurrentRecipe(agentId);
        if (onchainRecipe != recipeHash) revert RecipeMismatch();

        runs.push(Run({
            agentId: agentId,
            scenarioId: scenarioId,
            recipeHash: recipeHash,
            traceHash: traceHash,
            scoreSortinoE6: scoreSortinoE6,
            totalReturnE6: totalReturnE6,
            maxDrawdownE6: maxDrawdownE6,
            timestamp: uint64(block.timestamp),
            teeAttestation: teeAttestation,
            recordedBy: msg.sender
        }));
        runId = runs.length - 1;
        runsByAgent[agentId].push(runId);
        runsByScenario[scenarioId].push(runId);
        emit RunRecorded(runId, agentId, scenarioId, recipeHash, traceHash, scoreSortinoE6);
    }

    function getRun(uint256 runId) external view returns (Run memory) {
        return runs[runId];
    }

    function getRunsByAgent(uint256 agentId) external view returns (uint256[] memory) {
        return runsByAgent[agentId];
    }

    function getRunsByScenario(bytes32 scenarioId) external view returns (uint256[] memory) {
        return runsByScenario[scenarioId];
    }

    function totalRuns() external view returns (uint256) {
        return runs.length;
    }
}
