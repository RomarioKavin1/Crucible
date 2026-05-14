# Crucible On-Chain Layer Implementation Plan (Plan 3 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Deploy three Solidity contracts to 0G mainnet (`ScenarioRegistry`, `AgentRegistry` ERC-721, `RunRegistry`), publish 1+ scenarios on-chain, and ship `@crucible/og-client` TypeScript wrappers. Add a `--publish` flag to `crucible run` that uploads trace + scorecard to 0G Storage and records the run on-chain.

**Architecture:** Foundry workspace under `contracts/`. New TS package `@crucible/og-client` wraps ethers.js v6 + the 0G Storage SDK. Three contracts are minimal (~80-150 lines each); deploy scripts use Foundry's `forge script`. The CLI gains an opt-in `--publish` flag — without it, runs stay purely local.

**Tech Stack:** Solidity ^0.8.24, Foundry (forge/cast), ethers.js v6, `@0gfoundation/0g-storage-ts-sdk` (verified package name from docs.0g.ai, May 2026), TypeScript ESM.

**Verified network endpoints (from docs.0g.ai):**
- Galileo testnet — Chain ID 16602 — RPC `https://evmrpc-testnet.0g.ai` — Indexer `https://indexer-storage-testnet-turbo.0g.ai` — Faucet `https://faucet.0g.ai` — Explorer `https://chainscan-galileo.0g.ai`
- Mainnet — Chain ID 16661 — RPC `https://evmrpc.0g.ai` — Indexer `https://indexer-storage-turbo.0g.ai` — Explorer `https://chainscan.0g.ai`

**Out of scope (later):** TEE attestation enforcement (Compete-mode runs accept any signed attestation in v1, full TeeML wiring deferred), open attester registration, cross-chain bridges, Agent ID metadata standard beyond the basic ERC-721.

**This plan satisfies the hackathon submission requirement** for a 0G mainnet contract address + verifiable on-chain activity.

---

## File Structure

```
contracts/                          Foundry workspace
├── foundry.toml
├── remappings.txt
├── src/
│   ├── ScenarioRegistry.sol
│   ├── AgentRegistry.sol           ERC-721, inlined (no OZ dep)
│   └── RunRegistry.sol
├── test/
│   ├── ScenarioRegistry.t.sol
│   ├── AgentRegistry.t.sol
│   └── RunRegistry.t.sol
├── script/
│   ├── DeployTestnet.s.sol
│   └── DeployMainnet.s.sol
└── deployed-addresses.json         output: { testnet: {...}, mainnet: {...} }

packages/og-client/
├── package.json
├── tsconfig.json
├── src/
│   ├── chain-config.ts             RPC URLs, chain IDs, deployed contract addrs
│   ├── storage.ts                  uploadBytes, downloadBytes via 0G Storage SDK
│   ├── scenario-registry.ts        publishScenario, getScenario, listScenarios
│   ├── agent-registry.ts           mintAgent, updateRecipe, getCurrentRecipe
│   ├── run-registry.ts             recordRun, getRunsByAgent, getRunsByScenario
│   ├── publisher.ts                high-level: publishRun() bundling Storage + Chain
│   └── index.ts
└── test/
    └── (mocked unit tests)

apps/cli/src/
└── run.ts                          add --publish flag handling
```

---

## Task 1: Foundry workspace + ScenarioRegistry contract

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/remappings.txt`
- Create: `contracts/src/ScenarioRegistry.sol`
- Create: `contracts/test/ScenarioRegistry.t.sol`

- [ ] **Step 1: Verify Foundry installed**

```bash
forge --version
```

If missing: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

- [ ] **Step 2: Create foundry.toml**

```toml
[profile.default]
src = "src"
out = "out"
test = "test"
script = "script"
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
fs_permissions = [{ access = "read-write", path = "./" }]

[rpc_endpoints]
galileo = "${OG_GALILEO_RPC}"
mainnet = "${OG_MAINNET_RPC}"
```

- [ ] **Step 3: Create remappings.txt**

```
@/=src/
forge-std/=lib/forge-std/src/
```

- [ ] **Step 4: Install forge-std**

```bash
cd contracts && forge install foundry-rs/forge-std --no-commit && cd ..
```

- [ ] **Step 5: Implement ScenarioRegistry.sol**

```solidity
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
```

- [ ] **Step 6: Implement test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";

contract ScenarioRegistryTest is Test {
    ScenarioRegistry registry;
    address owner = address(0x1);
    address other = address(0x2);

    function setUp() public {
        vm.prank(owner);
        registry = new ScenarioRegistry();
    }

    function test_OwnerCanPublish() public {
        vm.prank(owner);
        registry.publishScenario(
            bytes32("eth-tariff"),
            keccak256("content"),
            keccak256("storage-root"),
            "public"
        );
        ScenarioRegistry.Scenario memory s = registry.getScenario(bytes32("eth-tariff"));
        assertEq(s.contentHash, keccak256("content"));
    }

    function test_NonOwnerCannotPublish() public {
        vm.prank(other);
        vm.expectRevert(ScenarioRegistry.NotOwner.selector);
        registry.publishScenario(bytes32("x"), keccak256("c"), keccak256("s"), "public");
    }

    function test_DoublePublishReverts() public {
        vm.startPrank(owner);
        registry.publishScenario(bytes32("x"), keccak256("c"), keccak256("s"), "public");
        vm.expectRevert(ScenarioRegistry.AlreadyPublished.selector);
        registry.publishScenario(bytes32("x"), keccak256("c2"), keccak256("s2"), "public");
        vm.stopPrank();
    }

    function test_GetUnknownReverts() public {
        vm.expectRevert(ScenarioRegistry.NotFound.selector);
        registry.getScenario(bytes32("nope"));
    }

    function test_ListScenarioIds() public {
        vm.startPrank(owner);
        registry.publishScenario(bytes32("a"), keccak256("c"), keccak256("s"), "public");
        registry.publishScenario(bytes32("b"), keccak256("c"), keccak256("s"), "held_out");
        vm.stopPrank();
        bytes32[] memory ids = registry.listScenarioIds();
        assertEq(ids.length, 2);
    }
}
```

- [ ] **Step 7: Run tests**

```bash
cd contracts && forge test -vv && cd ..
```

Expected: 5/5 pass.

- [ ] **Step 8: Commit**

```bash
git add contracts/foundry.toml contracts/remappings.txt contracts/src contracts/test contracts/.gitmodules contracts/lib
git commit -m "feat(contracts): foundry setup + ScenarioRegistry"
```

---

## Task 2: AgentRegistry (ERC-721, inlined)

**Files:**
- Create: `contracts/src/AgentRegistry.sol`
- Create: `contracts/test/AgentRegistry.t.sol`

- [ ] **Step 1: Implement AgentRegistry.sol** (minimal ERC-721, no OpenZeppelin dep to keep it auditable)

```solidity
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
```

- [ ] **Step 2: Implement test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry reg;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        reg = new AgentRegistry();
    }

    function test_MintAssignsId() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("ipfs://meta1");
        assertEq(id, 1);
        assertEq(reg.ownerOf(1), alice);
        assertEq(reg.balanceOf(alice), 1);
    }

    function test_MintIncrements() public {
        vm.startPrank(alice);
        uint256 id1 = reg.mintAgent("a");
        uint256 id2 = reg.mintAgent("b");
        assertEq(id1, 1);
        assertEq(id2, 2);
        vm.stopPrank();
    }

    function test_OwnerCanUpdateRecipe() public {
        vm.startPrank(alice);
        uint256 id = reg.mintAgent("a");
        bytes32 r1 = keccak256("recipe-v1");
        reg.updateRecipe(id, r1);
        assertEq(reg.getCurrentRecipe(id), r1);
        bytes32[] memory hist = reg.getRecipeHistory(id);
        assertEq(hist.length, 1);
        vm.stopPrank();
    }

    function test_NonOwnerCannotUpdateRecipe() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("a");
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        reg.updateRecipe(id, keccak256("r"));
    }

    function test_RecipeHistoryGrows() public {
        vm.startPrank(alice);
        uint256 id = reg.mintAgent("a");
        reg.updateRecipe(id, keccak256("r1"));
        reg.updateRecipe(id, keccak256("r2"));
        reg.updateRecipe(id, keccak256("r3"));
        bytes32[] memory hist = reg.getRecipeHistory(id);
        assertEq(hist.length, 3);
        assertEq(hist[2], keccak256("r3"));
        vm.stopPrank();
    }

    function test_Transfer() public {
        vm.prank(alice);
        uint256 id = reg.mintAgent("a");
        vm.prank(alice);
        reg.transferFrom(alice, bob, id);
        assertEq(reg.ownerOf(id), bob);
    }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd contracts && forge test -vv && cd ..
git add contracts/src/AgentRegistry.sol contracts/test/AgentRegistry.t.sol
git commit -m "feat(contracts): AgentRegistry ERC-721 (inlined, no OZ)"
```

---

## Task 3: RunRegistry contract

**Files:**
- Create: `contracts/src/RunRegistry.sol`
- Create: `contracts/test/RunRegistry.t.sol`

- [ ] **Step 1: Implement RunRegistry.sol**

```solidity
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
```

- [ ] **Step 2: Implement test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {RunRegistry} from "../src/RunRegistry.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RunRegistryTest is Test {
    AgentRegistry agents;
    RunRegistry runs;
    address owner   = address(this);
    address alice   = address(0xA11CE);

    function setUp() public {
        agents = new AgentRegistry();
        runs = new RunRegistry(address(agents));
        runs.setTrustedAttester(owner, true);
    }

    function _mintAndSetRecipe(address user, bytes32 recipeHash) internal returns (uint256) {
        vm.prank(user);
        uint256 id = agents.mintAgent("meta");
        vm.prank(user);
        agents.updateRecipe(id, recipeHash);
        return id;
    }

    function test_RecordRunHappyPath() public {
        bytes32 r = keccak256("recipe");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        uint256 runId = runs.recordRun(
            agentId, bytes32("eth"), r, keccak256("trace"), int256(310000), int256(-121000), int256(-184000), ""
        );
        assertEq(runId, 0);
        assertEq(runs.totalRuns(), 1);
        assertEq(runs.getRunsByAgent(agentId).length, 1);
        assertEq(runs.getRunsByScenario(bytes32("eth")).length, 1);
    }

    function test_UntrustedAttesterReverts() public {
        bytes32 r = keccak256("recipe");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        vm.prank(alice); // alice is not a trusted attester
        vm.expectRevert(RunRegistry.UntrustedAttester.selector);
        runs.recordRun(agentId, bytes32("eth"), r, keccak256("t"), 0, 0, 0, "");
    }

    function test_RecipeMismatchReverts() public {
        bytes32 r1 = keccak256("recipe-1");
        bytes32 r2 = keccak256("recipe-2");
        uint256 agentId = _mintAndSetRecipe(alice, r1);
        vm.expectRevert(RunRegistry.RecipeMismatch.selector);
        runs.recordRun(agentId, bytes32("eth"), r2, keccak256("t"), 0, 0, 0, "");
    }

    function test_OwnerCanGrantAttester() public {
        runs.setTrustedAttester(alice, true);
        bytes32 r = keccak256("r");
        uint256 agentId = _mintAndSetRecipe(alice, r);
        vm.prank(alice);
        runs.recordRun(agentId, bytes32("e"), r, keccak256("t"), 0, 0, 0, "");
        assertEq(runs.totalRuns(), 1);
    }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd contracts && forge test -vv && cd ..
git add contracts/src/RunRegistry.sol contracts/test/RunRegistry.t.sol
git commit -m "feat(contracts): RunRegistry append-only, anti-tuning recipe lock"
```

---

## Task 4: Deploy scripts

**Files:**
- Create: `contracts/script/DeployTestnet.s.sol`
- Create: `contracts/script/DeployMainnet.s.sol`
- Create: `contracts/.env.example`

- [ ] **Step 1: Create .env.example**

```
# 0G Galileo testnet
OG_GALILEO_RPC=https://evmrpc-testnet.0g.ai
# 0G mainnet
OG_MAINNET_RPC=https://evmrpc.0g.ai
# Deployer key — DO NOT COMMIT
DEPLOYER_PRIVATE_KEY=0x...
```

(Verify the actual RPC URLs by visiting docs.0g.ai before running deploys.)

- [ ] **Step 2: Implement DeployTestnet.s.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ScenarioRegistry} from "../src/ScenarioRegistry.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RunRegistry} from "../src/RunRegistry.sol";

contract DeployTestnet is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        ScenarioRegistry scenarioReg = new ScenarioRegistry();
        AgentRegistry agentReg = new AgentRegistry();
        RunRegistry runReg = new RunRegistry(address(agentReg));

        vm.stopBroadcast();

        console.log("ScenarioRegistry:", address(scenarioReg));
        console.log("AgentRegistry:   ", address(agentReg));
        console.log("RunRegistry:     ", address(runReg));
    }
}
```

- [ ] **Step 3: DeployMainnet is structurally identical**

`contracts/script/DeployMainnet.s.sol`: same body as DeployTestnet (different file for explicitness when reading deploy logs).

- [ ] **Step 4: Add to .gitignore**

Append to repo root `.gitignore`:
```
contracts/.env
contracts/cache/
contracts/out/
contracts/broadcast/
```

- [ ] **Step 5: Commit**

```bash
git add contracts/script contracts/.env.example .gitignore
git commit -m "feat(contracts): deploy scripts for Galileo + 0G mainnet"
```

---

## Task 5: Deploy to Galileo testnet

⚠️ This task requires DEPLOYER_PRIVATE_KEY in env and Galileo testnet 0G tokens (faucet).

- [ ] **Step 1: Get faucet tokens**

Visit `https://faucet.0g.ai` (or the Google Cloud Web3 Faucet at `https://cloud.google.com/application/web3/faucet/0g/galileo`) and fund the deployer wallet. Limit is 0.1 0G per wallet per day, which is plenty for deploying contracts. If you need more, ask in the 0G Discord.

- [ ] **Step 2: Set env**

```bash
cd contracts
cp .env.example .env
# Edit .env: set DEPLOYER_PRIVATE_KEY and verify OG_GALILEO_RPC
source .env
```

- [ ] **Step 3: Deploy**

```bash
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url $OG_GALILEO_RPC \
  --broadcast \
  --slow \
  -vvv
```

Expected output: 3 contract addresses logged.

- [ ] **Step 4: Capture addresses**

Update `contracts/deployed-addresses.json`:
```json
{
  "galileo": {
    "ScenarioRegistry": "0x...",
    "AgentRegistry": "0x...",
    "RunRegistry": "0x..."
  },
  "mainnet": {}
}
```

- [ ] **Step 5: Verify on Galileo Explorer**

Visit `https://chainscan-galileo.0g.ai/address/<ScenarioRegistry-address>` (the official Galileo block explorer, confirmed from docs.0g.ai).

Confirm: contract code visible, deployment tx visible.

- [ ] **Step 6: Commit deployed-addresses.json**

```bash
cd ..
git add contracts/deployed-addresses.json
git commit -m "deploy(contracts): Galileo testnet deployment + addresses"
```

---

## Task 6: Bootstrap @crucible/og-client package

**Files:**
- Create: `packages/og-client/package.json`
- Create: `packages/og-client/tsconfig.json`
- Create: `packages/og-client/src/index.ts`
- Create: `packages/og-client/src/chain-config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@crucible/og-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ethers": "^6.13.0",
    "@0gfoundation/0g-storage-ts-sdk": "*"
  }
}
```

The package name `@0gfoundation/0g-storage-ts-sdk` is verified from docs.0g.ai (May 2026). The SDK requires `ethers` as a peer dependency for blockchain interactions.

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create chain-config.ts** (parses deployed-addresses.json)

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Network = "galileo" | "mainnet";

export interface ChainConfig {
  network: Network;
  rpcUrl: string;
  contracts: {
    ScenarioRegistry: string;
    AgentRegistry: string;
    RunRegistry: string;
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDRESSES_PATH = path.resolve(__dirname, "../../../contracts/deployed-addresses.json");

export async function loadChainConfig(network: Network): Promise<ChainConfig> {
  const raw = await readFile(ADDRESSES_PATH, "utf8");
  const all = JSON.parse(raw) as Record<Network, ChainConfig["contracts"]>;
  if (!all[network] || !all[network].RunRegistry) {
    throw new Error(`No deployed addresses for network=${network}`);
  }
  const rpcUrl =
    network === "galileo"
      ? process.env.OG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai"
      : process.env.OG_MAINNET_RPC ?? "https://evmrpc.0g.ai";
  return { network, rpcUrl, contracts: all[network] };
}
```

- [ ] **Step 4: Empty index**

```typescript
// packages/og-client/src/index.ts
export * from "./chain-config.js";
```

- [ ] **Step 5: Install + commit**

```bash
pnpm install
pnpm --filter @crucible/og-client typecheck
git add packages/og-client
git commit -m "feat(og-client): bootstrap package + chain-config loader"
```

---

## Task 7: 0G Storage wrappers

**Files:**
- Create: `packages/og-client/src/storage.ts`

API surface verified against docs.0g.ai (May 2026): the SDK exports `Indexer`, `ZgFile`, `MemData`, and `Blob` (alias as `ZgBlob` to avoid native Blob collision). Methods return Go-style `[result, err]` tuples. `Indexer.upload(file, rpcUrl, signer)` returns `[tx, err]` where `tx` is `{ rootHash, txHash }` for single uploads (or `{ rootHashes, txHashes }` for fragmented >4GB files). `Indexer.download(rootHash, outputPath, withProof)` returns just `err` and uses `fs.appendFileSync` (Node-only — not browser-safe). `MemData(Uint8Array)` lets us upload in-memory blobs (perfect for trace.jsonl) without writing to disk first.

- [ ] **Step 1: Implement storage.ts**

```typescript
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ethers } from "ethers";

export interface StorageConfig {
  indexerUrl: string;
  rpcUrl: string;
  privateKey: string;
}

function defaultConfig(network: "galileo" | "mainnet"): StorageConfig {
  const indexerUrl =
    network === "galileo"
      ? process.env.OG_GALILEO_INDEXER ?? "https://indexer-storage-testnet-turbo.0g.ai"
      : process.env.OG_MAINNET_INDEXER ?? "https://indexer-storage-turbo.0g.ai";
  const rpcUrl =
    network === "galileo"
      ? process.env.OG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai"
      : process.env.OG_MAINNET_RPC ?? "https://evmrpc.0g.ai";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY for storage uploads");
  return { indexerUrl, rpcUrl, privateKey };
}

/** Upload an in-memory byte buffer to 0G Storage. Returns the Merkle root hash and the on-chain tx hash. */
export async function uploadBytes(
  data: Uint8Array,
  network: "galileo" | "mainnet" = "galileo"
): Promise<{ rootHash: string; txHash: string }> {
  const cfg = defaultConfig(network);
  const indexer = new Indexer(cfg.indexerUrl);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(cfg.privateKey, provider);

  const memData = new MemData(data);
  const [tree, treeErr] = await memData.merkleTree();
  if (treeErr !== null) throw new Error(`merkleTree: ${treeErr}`);
  const rootHash = tree!.rootHash();

  const [tx, uploadErr] = await indexer.upload(memData, cfg.rpcUrl, signer);
  if (uploadErr !== null) throw new Error(`upload: ${uploadErr}`);

  // tx may be { rootHash, txHash } (single) or { rootHashes, txHashes } (fragmented).
  // Our trace.jsonl files are well under 4GB so we expect the single-upload shape.
  const single = tx as { rootHash?: string; txHash?: string };
  return {
    rootHash: single.rootHash ?? rootHash!,
    txHash: single.txHash ?? "",
  };
}

/** Download by root hash. Uses Node fs internally (not browser-safe). */
export async function downloadBytes(
  rootHash: string,
  network: "galileo" | "mainnet" = "galileo"
): Promise<Uint8Array> {
  const cfg = defaultConfig(network);
  const tmp = await mkdtemp(path.join(tmpdir(), "og-download-"));
  const fp = path.join(tmp, "blob.bin");
  try {
    const indexer = new Indexer(cfg.indexerUrl);
    const err = await indexer.download(rootHash, fp, true /* withProof */);
    if (err !== null) throw new Error(`download: ${err}`);
    return new Uint8Array(await readFile(fp));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
```

Notes:
- `MemData` is preferred over `ZgFile.fromFilePath()` because it avoids a temp file roundtrip for our typical use case (trace.jsonl already in memory).
- The SDK returns Go-style tuples `[result, err]` with `null` (not undefined) for the error slot on success. Always check `err !== null`.
- For browser-side downloads (Plan 5's public web app), `Indexer.download()` won't work — it uses Node `fs.appendFileSync` internally. Either proxy through a server route (which Plan 5 does) or use `Indexer.downloadToBlob()`.

- [ ] **Step 3: Re-export, commit**

```bash
# Append to index.ts: export * from "./storage.js";
git add packages/og-client/src/storage.ts packages/og-client/src/index.ts
git commit -m "feat(og-client): 0G Storage upload/download wrappers"
```

---

## Task 8: Contract ABI wrappers (ScenarioRegistry, AgentRegistry, RunRegistry)

**Files:**
- Create: `packages/og-client/src/abis.ts`
- Create: `packages/og-client/src/scenario-registry.ts`
- Create: `packages/og-client/src/agent-registry.ts`
- Create: `packages/og-client/src/run-registry.ts`

- [ ] **Step 1: Generate ABIs**

```bash
cd contracts && forge build && cd ..
```

Then extract minimal ABIs into TS:

`packages/og-client/src/abis.ts`:
```typescript
export const SCENARIO_REGISTRY_ABI = [
  "function publishScenario(bytes32 id, bytes32 contentHash, bytes32 storageRootHash, string visibility) external",
  "function getScenario(bytes32 id) external view returns (tuple(bytes32 contentHash, bytes32 storageRootHash, string visibility, uint64 publishedAt))",
  "function listScenarioIds() external view returns (bytes32[])",
  "function owner() external view returns (address)",
  "event ScenarioPublished(bytes32 indexed id, bytes32 contentHash, bytes32 storageRootHash, string visibility)",
] as const;

export const AGENT_REGISTRY_ABI = [
  "function mintAgent(string metadataURI) external returns (uint256)",
  "function updateRecipe(uint256 agentId, bytes32 recipeHash) external",
  "function getCurrentRecipe(uint256 agentId) external view returns (bytes32)",
  "function getRecipeHistory(uint256 agentId) external view returns (bytes32[])",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event AgentMinted(uint256 indexed agentId, address indexed owner, string metadataURI)",
  "event RecipeUpdated(uint256 indexed agentId, bytes32 indexed recipeHash, uint256 historyLen)",
] as const;

export const RUN_REGISTRY_ABI = [
  "function recordRun(uint256 agentId, bytes32 scenarioId, bytes32 recipeHash, bytes32 traceHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6, bytes teeAttestation) external returns (uint256)",
  "function getRun(uint256 runId) external view returns (tuple(uint256 agentId, bytes32 scenarioId, bytes32 recipeHash, bytes32 traceHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6, uint64 timestamp, bytes teeAttestation, address recordedBy))",
  "function getRunsByAgent(uint256 agentId) external view returns (uint256[])",
  "function getRunsByScenario(bytes32 scenarioId) external view returns (uint256[])",
  "function totalRuns() external view returns (uint256)",
  "function setTrustedAttester(address a, bool allowed) external",
  "event RunRecorded(uint256 indexed runId, uint256 indexed agentId, bytes32 indexed scenarioId, bytes32 recipeHash, bytes32 traceHash, int256 scoreSortinoE6)",
] as const;
```

- [ ] **Step 2: Implement scenario-registry.ts**

```typescript
import { ethers } from "ethers";
import { SCENARIO_REGISTRY_ABI } from "./abis.js";
import type { ChainConfig } from "./chain-config.js";

export class ScenarioRegistryClient {
  private contract: ethers.Contract;
  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(cfg.contracts.ScenarioRegistry, SCENARIO_REGISTRY_ABI, signerOrProvider);
  }
  async publish(id: string, contentHash: string, storageRootHash: string, visibility: string) {
    const idBytes32 = ethers.encodeBytes32String(id);
    const tx = await this.contract.publishScenario(idBytes32, contentHash, storageRootHash, visibility);
    return tx.wait();
  }
  async get(id: string) {
    const idBytes32 = ethers.encodeBytes32String(id);
    return this.contract.getScenario(idBytes32);
  }
  async listIds(): Promise<string[]> {
    const ids: string[] = await this.contract.listScenarioIds();
    return ids.map((b) => ethers.decodeBytes32String(b));
  }
}
```

- [ ] **Step 3: Implement agent-registry.ts**

```typescript
import { ethers } from "ethers";
import { AGENT_REGISTRY_ABI } from "./abis.js";
import type { ChainConfig } from "./chain-config.js";

export class AgentRegistryClient {
  private contract: ethers.Contract;
  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(cfg.contracts.AgentRegistry, AGENT_REGISTRY_ABI, signerOrProvider);
  }
  async mint(metadataURI: string): Promise<{ agentId: bigint; txHash: string }> {
    const tx = await this.contract.mintAgent(metadataURI);
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l: ethers.Log) => {
        try { return this.contract.interface.parseLog(l); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "AgentMinted");
    return { agentId: ev!.args[0] as bigint, txHash: tx.hash };
  }
  async updateRecipe(agentId: bigint, recipeHash: string) {
    const tx = await this.contract.updateRecipe(agentId, recipeHash);
    return tx.wait();
  }
  async getCurrentRecipe(agentId: bigint): Promise<string> {
    return this.contract.getCurrentRecipe(agentId);
  }
}
```

- [ ] **Step 4: Implement run-registry.ts**

```typescript
import { ethers } from "ethers";
import { RUN_REGISTRY_ABI } from "./abis.js";
import type { ChainConfig } from "./chain-config.js";

export interface RecordRunArgs {
  agentId: bigint;
  scenarioId: string;
  recipeHash: string;
  traceHash: string;
  scoreSortino: number;        // raw float; will be scaled by 1e6
  totalReturn: number;
  maxDrawdown: number;
  teeAttestation?: string;     // hex bytes
}

export class RunRegistryClient {
  private contract: ethers.Contract;
  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(cfg.contracts.RunRegistry, RUN_REGISTRY_ABI, signerOrProvider);
  }
  async recordRun(args: RecordRunArgs): Promise<{ runId: bigint; txHash: string }> {
    const e6 = (x: number) => BigInt(Math.trunc(x * 1_000_000));
    const tx = await this.contract.recordRun(
      args.agentId,
      ethers.encodeBytes32String(args.scenarioId),
      args.recipeHash,
      args.traceHash,
      e6(args.scoreSortino),
      e6(args.totalReturn),
      e6(args.maxDrawdown),
      args.teeAttestation ?? "0x"
    );
    const receipt = await tx.wait();
    const ev = receipt!.logs
      .map((l: ethers.Log) => { try { return this.contract.interface.parseLog(l); } catch { return null; } })
      .find((e: ethers.LogDescription | null) => e?.name === "RunRecorded");
    return { runId: ev!.args[0] as bigint, txHash: tx.hash };
  }
  async getRun(runId: bigint) {
    return this.contract.getRun(runId);
  }
  async getRunsByScenario(scenarioId: string): Promise<bigint[]> {
    return this.contract.getRunsByScenario(ethers.encodeBytes32String(scenarioId));
  }
  async totalRuns(): Promise<bigint> {
    return this.contract.totalRuns();
  }
}
```

- [ ] **Step 5: Re-export all + commit**

```typescript
// packages/og-client/src/index.ts (full content)
export * from "./chain-config.js";
export * from "./storage.js";
export * from "./abis.js";
export * from "./scenario-registry.js";
export * from "./agent-registry.js";
export * from "./run-registry.js";
```

```bash
pnpm --filter @crucible/og-client typecheck
git add packages/og-client/src
git commit -m "feat(og-client): ABIs + ethers v6 wrappers for 3 contracts"
```

---

## Task 9: Publisher utility (Storage + Chain bundled)

**Files:**
- Create: `packages/og-client/src/publisher.ts`

- [ ] **Step 1: Implement publisher.ts**

```typescript
import { ethers } from "ethers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadBytes } from "./storage.js";
import { loadChainConfig } from "./chain-config.js";
import { ScenarioRegistryClient } from "./scenario-registry.js";
import { AgentRegistryClient } from "./agent-registry.js";
import { RunRegistryClient } from "./run-registry.js";

export interface PublishRunOpts {
  runDir: string;
  agentId: bigint;
  recipeHash: string;
  network: "galileo" | "mainnet";
  privateKey: string;
}

export async function publishRun(opts: PublishRunOpts) {
  const cfg = await loadChainConfig(opts.network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(opts.privateKey, provider);

  // 1. Read trace + scorecard
  const trace = await readFile(path.join(opts.runDir, "trace.jsonl"));
  const scorecardRaw = await readFile(path.join(opts.runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw) as {
    scenario: string;
    scorecard: { sortino: number; totalReturnPct: number; maxDrawdownPct: number };
  };

  // 2. Upload trace to 0G Storage
  console.log("Uploading trace to 0G Storage...");
  const { rootHash: traceHash, txHash: storageTx } = await uploadBytes(trace, opts.network);
  console.log(`  trace rootHash: ${traceHash} (tx ${storageTx})`);

  // 3. Lock recipe on-chain
  const agentClient = new AgentRegistryClient(cfg, signer);
  const onchainRecipe = await agentClient.getCurrentRecipe(opts.agentId);
  if (onchainRecipe.toLowerCase() !== opts.recipeHash.toLowerCase()) {
    console.log(`Updating on-chain recipe for agent ${opts.agentId} → ${opts.recipeHash}`);
    await agentClient.updateRecipe(opts.agentId, opts.recipeHash);
  }

  // 4. Record run
  const runClient = new RunRegistryClient(cfg, signer);
  console.log("Recording run on-chain...");
  const { runId, txHash } = await runClient.recordRun({
    agentId: opts.agentId,
    scenarioId: scorecard.scenario,
    recipeHash: opts.recipeHash,
    traceHash,
    scoreSortino: scorecard.scorecard.sortino,
    totalReturn: scorecard.scorecard.totalReturnPct,
    maxDrawdown: scorecard.scorecard.maxDrawdownPct,
  });
  console.log(`  runId=${runId} (tx ${txHash})`);
  return { runId, txHash, traceHash };
}
```

- [ ] **Step 2: Commit**

```bash
# Append re-export to index.ts
git add packages/og-client/src/publisher.ts packages/og-client/src/index.ts
git commit -m "feat(og-client): publishRun bundling Storage upload + AgentRegistry + RunRegistry"
```

---

## Task 10: Wire `--publish` flag into `crucible run`

**Files:**
- Modify: `apps/cli/package.json` (add @crucible/og-client dep)
- Modify: `apps/cli/src/run.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Add dep**

```json
"@crucible/og-client": "workspace:*"
```

```bash
pnpm install
```

- [ ] **Step 2: Extend RunOpts + runCommand**

In `apps/cli/src/run.ts`, append after the existing summary print:

```typescript
import { publishRun } from "@crucible/og-client";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// Extend RunOpts:
export interface RunOpts {
  scenario: string;
  agent: string;
  outDir: string;
  publish?: { agentId: bigint; network: "galileo" | "mainnet"; privateKey: string };
}

// At the end of runCommand, before the closing brace, add:
if (opts.publish) {
  const recipeBytes = await readFile(opts.agent);
  const recipeHash = "0x" + createHash("sha256").update(recipeBytes).digest("hex");
  console.log(`Publishing to 0G ${opts.publish.network}...`);
  const { runId, txHash } = await publishRun({
    runDir,
    agentId: opts.publish.agentId,
    recipeHash,
    network: opts.publish.network,
    privateKey: opts.publish.privateKey,
  });
  console.log(`  Run ID on-chain: ${runId}`);
  console.log(`  Tx hash:         ${txHash}`);
}
```

- [ ] **Step 3: Wire flags in index.ts**

Add to the `run` subcommand:

```typescript
.option("--publish-network <net>", "If set, publish run to 0G chain (galileo|mainnet)")
.option("--publish-agent-id <id>", "Required with --publish-network: agent token id (number)")
.option("--publish-key-env <env>", "Env var holding deployer private key", "DEPLOYER_PRIVATE_KEY")
.action(async (opts) => {
  let publish: RunOpts["publish"] = undefined;
  if (opts.publishNetwork) {
    if (!opts.publishAgentId) throw new Error("--publish-network requires --publish-agent-id");
    const pk = process.env[opts.publishKeyEnv];
    if (!pk) throw new Error(`Missing env var ${opts.publishKeyEnv}`);
    publish = {
      agentId: BigInt(opts.publishAgentId),
      network: opts.publishNetwork as "galileo" | "mainnet",
      privateKey: pk,
    };
  }
  await runCommand({ scenario: opts.scenario, agent: opts.agent, outDir: opts.outDir, publish });
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/cli pnpm-lock.yaml
git commit -m "feat(cli): --publish flag for crucible run (uploads trace + records on-chain)"
```

---

## Task 11: Publish 1 scenario to Galileo testnet

⚠️ Manual smoke test. Requires Galileo testnet 0G + deployed contracts (Task 5).

- [ ] **Step 1: Compute content hash of synthetic-eth-flash-crash bundle**

```bash
node -e '
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dir = "scenarios/synthetic-eth-flash-crash";
const h = crypto.createHash("sha256");
for (const f of fs.readdirSync(dir).sort()) {
  h.update(f); h.update(fs.readFileSync(path.join(dir, f)));
}
console.log("0x" + h.digest("hex"));
'
```

Capture this content hash.

- [ ] **Step 2: Tarball + upload to 0G Storage**

```bash
tar -czf /tmp/eth-tariff.tar.gz -C scenarios synthetic-eth-flash-crash
node -e '
const { uploadBytes } = require("./packages/og-client/dist/storage.js");
const fs = require("fs");
(async () => {
  const data = fs.readFileSync("/tmp/eth-tariff.tar.gz");
  const r = await uploadBytes(new Uint8Array(data), "galileo");
  console.log(r);
})();
'
```

(May need `pnpm -r build` first.)

Capture the storage rootHash.

- [ ] **Step 3: Publish to ScenarioRegistry on Galileo**

```bash
node -e '
const { ethers } = require("ethers");
const { ScenarioRegistryClient, loadChainConfig } = require("./packages/og-client/dist");
(async () => {
  const cfg = await loadChainConfig("galileo");
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const client = new ScenarioRegistryClient(cfg, signer);
  const tx = await client.publish(
    "eth-tariff",                           // scenario id (max 31 ASCII chars for bytes32)
    "<paste content hash from Step 1>",
    "<paste storage rootHash from Step 2>",
    "public"
  );
  console.log("tx:", tx.hash);
})();
'
```

- [ ] **Step 4: Verify on Galileo Explorer**

Visit `https://chainscan-galileo.0g.ai/address/<ScenarioRegistry-address>` — should show one new tx + one ScenarioPublished event.

- [ ] **Step 5: Commit notes**

```bash
mkdir -p samples
echo "scenarios published to galileo: eth-tariff" >> samples/galileo-publishing.log
git add samples
git commit -m "deploy(scenarios): publish synthetic-eth-flash-crash to Galileo"
```

---

## Task 12: Deploy to 0G mainnet + publish 1 scenario

⚠️ COSTS REAL MONEY. Verify code is reviewed before running.

- [ ] **Step 1: Fund deployer wallet with mainnet 0G**

Acquire mainnet 0G via the project's token (DEX, bridge, or grant). Confirm balance via Galileo Explorer's mainnet equivalent.

- [ ] **Step 2: Deploy**

```bash
cd contracts
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $OG_MAINNET_RPC \
  --broadcast \
  --slow \
  -vvv
cd ..
```

- [ ] **Step 3: Update deployed-addresses.json**

Add the 3 mainnet addresses under `"mainnet"` key.

- [ ] **Step 4: Publish synthetic-eth-flash-crash to mainnet**

Repeat Task 11 steps 2-3 with `network: "mainnet"` and the mainnet addresses.

- [ ] **Step 5: Capture explorer link**

Save `https://chainscan.0g.ai/address/<RunRegistry-mainnet-address>` to `samples/mainnet-explorer-links.md` — this is your hackathon submission's contract address. (Mainnet explorer URL verified from docs.0g.ai.)

- [ ] **Step 6: Commit**

```bash
git add contracts/deployed-addresses.json samples/mainnet-explorer-links.md
git commit -m "deploy(contracts): 0G mainnet deployment + scenario publish"
```

---

## Task 13: End-to-end publish smoke (Galileo)

- [ ] **Step 1: Mint an Agent ID**

```bash
node -e '
const { ethers } = require("ethers");
const { AgentRegistryClient, loadChainConfig } = require("./packages/og-client/dist");
(async () => {
  const cfg = await loadChainConfig("galileo");
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const client = new AgentRegistryClient(cfg, signer);
  const r = await client.mint("ipfs://baseline-claude-meta");
  console.log("agentId:", r.agentId.toString(), "tx:", r.txHash);
})();
'
```

Capture the agentId.

- [ ] **Step 2: Run an agent + publish in one go**

```bash
export ANTHROPIC_API_KEY=...
export DEPLOYER_PRIVATE_KEY=...
pnpm --filter @crucible/cli start run \
  --scenario scenarios/synthetic-eth-flash-crash \
  --agent apps/cli/test/fixtures/baseline-recipe.yaml \
  --out-dir runs \
  --publish-network galileo \
  --publish-agent-id <agentId from step 1>
```

Expected: completes the run, then prints "Publishing to 0G galileo..." and finally a runId + txHash. The Explorer will show the new transactions.

- [ ] **Step 3: Verify**

Browse to the RunRegistry contract on Galileo Explorer; confirm a `RunRecorded` event with the expected agentId/scenarioId/recipeHash.

- [ ] **Step 4: Commit sample log**

```bash
echo "first end-to-end publish on galileo: runId=<X>, tx=<Y>" >> samples/galileo-publishing.log
git add samples
git commit -m "smoke: first end-to-end publish run on Galileo"
```

---

## Self-Review Checklist

1. **Spec coverage (Plan 3):** ScenarioRegistry ✓, AgentRegistry ERC-721 ✓, RunRegistry ✓, deployed to Galileo ✓, deployed to mainnet ✓, scenario published on both ✓, og-client SDK ✓, --publish flag ✓.
2. **Submission alignment:** mainnet contract address (RunRegistry) captured in `samples/mainnet-explorer-links.md`. Verifiable on-chain activity = scenario publish + agent mint + run record.
3. **Out of scope:** TEE attestation enforcement (v1 uses owner-allowlist trustedAttester model), open attester registration, Compete-mode rigor (Coach + leaderboard layer comes via Plan 5).
4. **Placeholders:** none. Each step has commands or code.
5. **Risks:** SDK shape verified against docs.0g.ai (May 2026): package is `@0gfoundation/0g-storage-ts-sdk`, `Indexer.upload()` returns `[tx, err]` tuple with `tx = { rootHash, txHash }` for single uploads. If the SDK API drifts (versions are still pre-1.0 in some areas), check the [TypeScript Starter Kit](https://github.com/0gfoundation/0g-storage-ts-starter-kit) for the canonical example.
