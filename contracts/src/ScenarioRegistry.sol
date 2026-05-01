// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ScenarioRegistry
/// @notice Maps a scenarioId to the keccak-256 hash of its bundle on 0G Storage.
/// @dev Owner-only writes for v1. Future versions may open publication.
contract ScenarioRegistry {
    address public owner;

    mapping(bytes32 => bytes32) public scenarioContentHash;
    bytes32[] public scenarioIds;

    event ScenarioPublished(bytes32 indexed scenarioId, bytes32 contentHash);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error AlreadyPublished();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address to) external onlyOwner {
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    function publishScenario(bytes32 scenarioId, bytes32 contentHash) external onlyOwner {
        if (scenarioContentHash[scenarioId] != bytes32(0)) revert AlreadyPublished();
        scenarioContentHash[scenarioId] = contentHash;
        scenarioIds.push(scenarioId);
        emit ScenarioPublished(scenarioId, contentHash);
    }

    function scenarioCount() external view returns (uint256) {
        return scenarioIds.length;
    }
}
