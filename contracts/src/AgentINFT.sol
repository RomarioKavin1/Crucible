// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  AgentINFT — Simplified ERC-7857 for Crucible Bench v2
/// @notice ERC-721 + plaintext IntelligentData. Encrypted-metadata + TEE re-encryption
///         transfers are deferred to v3 (waiting on 0G TEE oracle).
contract AgentINFT {
    string public constant name = "Crucible Agent INFT";
    string public constant symbol = "CAINFT";

    struct IntelligentData {
        string  dataDescription;   // plaintext in v1 (e.g. "Momentum trader v1 by 0xAB12")
        bytes32 dataHash;           // commitment to off-chain agent code/weights
    }

    uint256 private _nextId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => IntelligentData) private _data;
    mapping(address => uint256[]) private _ownedTokens;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string dataDescription, bytes32 dataHash);

    error TokenDoesNotExist();

    function mint(string calldata dataDescription, bytes32 dataHash) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _ownedTokens[msg.sender].push(tokenId);
        _data[tokenId] = IntelligentData(dataDescription, dataHash);
        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentMinted(tokenId, msg.sender, dataDescription, dataHash);
    }

    function tokensOf(address owner_) external view returns (uint256[] memory) {
        return _ownedTokens[owner_];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert TokenDoesNotExist();
        return o;
    }

    function balanceOf(address owner_) external view returns (uint256) {
        return _balances[owner_];
    }

    function intelligentData(uint256 tokenId) external view returns (string memory, bytes32) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        IntelligentData memory d = _data[tokenId];
        return (d.dataDescription, d.dataHash);
    }

    // ─── Delegation (hot/cold key separation) ────────────────────────────────

    uint256 public constant MAX_DELEGATIONS = 100;

    mapping(uint256 => address[]) private _delegations;
    mapping(uint256 => mapping(address => bool)) private _isDelegated;

    event AccessDelegated(uint256 indexed tokenId, address indexed assistant);
    event AccessRevoked(uint256 indexed tokenId, address indexed assistant);

    error NotOwner();
    error DelegationCapReached();
    error InvalidAssistant();

    function delegateAccess(uint256 tokenId, address assistant) external {
        if (_owners[tokenId] != msg.sender) revert NotOwner();
        if (assistant == address(0)) revert InvalidAssistant();
        if (_isDelegated[tokenId][assistant]) return; // idempotent
        if (_delegations[tokenId].length >= MAX_DELEGATIONS) revert DelegationCapReached();
        _delegations[tokenId].push(assistant);
        _isDelegated[tokenId][assistant] = true;
        emit AccessDelegated(tokenId, assistant);
    }

    function revokeAccess(uint256 tokenId, address assistant) external {
        if (_owners[tokenId] != msg.sender) revert NotOwner();
        if (!_isDelegated[tokenId][assistant]) return; // idempotent
        address[] storage list = _delegations[tokenId];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == assistant) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        _isDelegated[tokenId][assistant] = false;
        emit AccessRevoked(tokenId, assistant);
    }

    function isAuthorized(uint256 tokenId, address signer) external view returns (bool) {
        if (_owners[tokenId] == address(0)) return false;
        if (_owners[tokenId] == signer) return true;
        return _isDelegated[tokenId][signer];
    }

    function getDelegations(uint256 tokenId) external view returns (address[] memory) {
        return _delegations[tokenId];
    }
}
