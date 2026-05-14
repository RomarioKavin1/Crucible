// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Agent ID NFT. Each agent has a recipe history (recipe = model + system prompt + tools + config).
contract AgentRegistry {
    string public constant name = "Crucible Agent ID";
    string public constant symbol = "CAID";

    uint256 private _nextId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bytes32) private _currentRecipeHash;
    mapping(uint256 => bytes32[]) private _recipeHistory;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentMinted(uint256 indexed agentId, address indexed owner, string metadataURI);
    event RecipeUpdated(uint256 indexed agentId, bytes32 indexed recipeHash, uint256 historyLen);

    error NotOwner();
    error TokenDoesNotExist();
    error TransferToZero();

    function balanceOf(address ownerAddr) external view returns (uint256) {
        return _balances[ownerAddr];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert TokenDoesNotExist();
        return o;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return _tokenURIs[tokenId];
    }

    function mintAgent(string calldata metadataURI) external returns (uint256 agentId) {
        agentId = _nextId++;
        _owners[agentId] = msg.sender;
        _balances[msg.sender] += 1;
        _tokenURIs[agentId] = metadataURI;
        emit Transfer(address(0), msg.sender, agentId);
        emit AgentMinted(agentId, msg.sender, metadataURI);
    }

    function updateRecipe(uint256 agentId, bytes32 recipeHash) external {
        if (_owners[agentId] != msg.sender) revert NotOwner();
        _currentRecipeHash[agentId] = recipeHash;
        _recipeHistory[agentId].push(recipeHash);
        emit RecipeUpdated(agentId, recipeHash, _recipeHistory[agentId].length);
    }

    function getCurrentRecipe(uint256 agentId) external view returns (bytes32) {
        if (_owners[agentId] == address(0)) revert TokenDoesNotExist();
        return _currentRecipeHash[agentId];
    }

    function getRecipeHistory(uint256 agentId) external view returns (bytes32[] memory) {
        if (_owners[agentId] == address(0)) revert TokenDoesNotExist();
        return _recipeHistory[agentId];
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        if (_owners[tokenId] != msg.sender) revert NotOwner();
        if (to == address(0)) revert TransferToZero();
        if (from != msg.sender) revert NotOwner();
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }
}
