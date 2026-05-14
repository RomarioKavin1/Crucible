// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Maps scenario IDs to content hashes. Owner-only writes; public reads.
contract ScenarioRegistry {
    struct Scenario {
        bytes32 contentHash;   // SHA-256 of the bundle on 0G Storage
        bytes32 storageRootHash; // 0G Storage root hash for fetch
        string  visibility;    // "public" | "held_out"
        uint64  publishedAt;   // block.timestamp
    }

    address public owner;
    mapping(bytes32 => Scenario) private scenarios;
    bytes32[] private scenarioIds;

    event ScenarioPublished(bytes32 indexed id, bytes32 contentHash, bytes32 storageRootHash, string visibility);

    error NotOwner();
    error AlreadyPublished();
    error NotFound();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function publishScenario(
        bytes32 id,
        bytes32 contentHash,
        bytes32 storageRootHash,
        string calldata visibility
    ) external onlyOwner {
        if (scenarios[id].publishedAt != 0) revert AlreadyPublished();
        scenarios[id] = Scenario({
            contentHash: contentHash,
            storageRootHash: storageRootHash,
            visibility: visibility,
            publishedAt: uint64(block.timestamp)
        });
        scenarioIds.push(id);
        emit ScenarioPublished(id, contentHash, storageRootHash, visibility);
    }

    function getScenario(bytes32 id) external view returns (Scenario memory) {
        Scenario memory s = scenarios[id];
        if (s.publishedAt == 0) revert NotFound();
        return s;
    }

    function listScenarioIds() external view returns (bytes32[] memory) {
        return scenarioIds;
    }
}
