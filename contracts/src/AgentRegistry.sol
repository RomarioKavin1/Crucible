// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry — ERC-721 Agent IDs for Crucible
/// @notice Minimal ERC-721 inlined so we don't pull in OZ for the hackathon.
contract AgentRegistry {
    string public constant name = "Crucible Agent";
    string public constant symbol = "CAGENT";

    uint256 public totalSupply;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => string) public tokenURI;

    mapping(uint256 => bytes32) public currentRecipeHash;
    mapping(uint256 => bytes32[]) private _recipeHistory;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string metadataURI);
    event RecipeUpdated(uint256 indexed tokenId, bytes32 recipeHash);

    error NotOwner();

    function mintAgent(string calldata metadataURI) external returns (uint256 tokenId) {
        tokenId = ++totalSupply;
        _ownerOf[tokenId] = msg.sender;
        _balanceOf[msg.sender] += 1;
        tokenURI[tokenId] = metadataURI;
        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentMinted(tokenId, msg.sender, metadataURI);
    }

    function updateRecipe(uint256 tokenId, bytes32 recipeHash) external {
        if (_ownerOf[tokenId] != msg.sender) revert NotOwner();
        currentRecipeHash[tokenId] = recipeHash;
        _recipeHistory[tokenId].push(recipeHash);
        emit RecipeUpdated(tokenId, recipeHash);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf[tokenId];
    }

    function balanceOf(address who) external view returns (uint256) {
        return _balanceOf[who];
    }

    function recipeHistory(uint256 tokenId) external view returns (bytes32[] memory) {
        return _recipeHistory[tokenId];
    }
}
