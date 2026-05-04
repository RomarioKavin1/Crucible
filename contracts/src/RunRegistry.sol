// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RunRegistry — append-only record of Compete-mode runs.
/// @notice Each run is signed by a registered TEE attester. The contract
///         verifies the attestation before accepting the score.
contract RunRegistry {
    struct Run {
        uint256 agentId;
        bytes32 scenarioId;
        bytes32 recipeHash;
        bytes32 traceHash;
        int256 scoreFixed; // Sortino * 1e6
        uint64 timestamp;
        address attester;
    }

    Run[] public runs;
    mapping(address => bool) public trustedAttester;
    address public owner;

    event RunRecorded(
        uint256 indexed runId,
        uint256 indexed agentId,
        bytes32 indexed scenarioId,
        bytes32 recipeHash,
        bytes32 traceHash,
        int256 scoreFixed,
        address attester
    );
    event AttesterRegistered(address attester);
    event AttesterRevoked(address attester);

    error NotOwner();
    error UntrustedAttester();
    error BadSignature();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function registerAttester(address attester) external onlyOwner {
        trustedAttester[attester] = true;
        emit AttesterRegistered(attester);
    }

    function revokeAttester(address attester) external onlyOwner {
        trustedAttester[attester] = false;
        emit AttesterRevoked(attester);
    }

    function recordRun(
        uint256 agentId,
        bytes32 scenarioId,
        bytes32 recipeHash,
        bytes32 traceHash,
        int256 scoreFixed,
        bytes calldata sig
    ) external returns (uint256 runId) {
        bytes32 digest = keccak256(
            abi.encode(agentId, scenarioId, recipeHash, traceHash, scoreFixed)
        );
        address signer = _recover(digest, sig);
        if (!trustedAttester[signer]) revert UntrustedAttester();

        runId = runs.length;
        runs.push(
            Run({
                agentId: agentId,
                scenarioId: scenarioId,
                recipeHash: recipeHash,
                traceHash: traceHash,
                scoreFixed: scoreFixed,
                timestamp: uint64(block.timestamp),
                attester: signer
            })
        );
        emit RunRecorded(runId, agentId, scenarioId, recipeHash, traceHash, scoreFixed, signer);
    }

    function runCount() external view returns (uint256) {
        return runs.length;
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 0x20))
            v := byte(0, calldataload(add(sig.offset, 0x40)))
        }
        bytes32 prefixed = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        return ecrecover(prefixed, v, r, s);
    }
}
