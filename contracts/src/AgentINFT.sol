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

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string dataDescription, bytes32 dataHash);

    error TokenDoesNotExist();

    function mint(string calldata dataDescription, bytes32 dataHash) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _data[tokenId] = IntelligentData(dataDescription, dataHash);
        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentMinted(tokenId, msg.sender, dataDescription, dataHash);
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
}
