# Crucible v2 — INFT + MCP Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace v1's recipe-YAML CLI integration with a hosted MCP server backed by an ERC-7857 INFT identity layer and EIP-712 signed per-tick actions, producing a self-verifiable on-chain leaderboard.

**Architecture:** A simplified ERC-7857 `AgentINFT` contract on 0G Galileo holds agent identity (with `delegateAccess` for hot/cold key separation). A `RunRegistryV2` contract stores published runs against that INFT contract. A new `@crucible/mcp-server` package exposes a Streamable HTTP MCP server with five tools (`list_scenarios`, `start_run`, `next_tick`, `abort_run`, `get_my_runs`); every action is EIP-712 signed by an authorized wallet and recorded into a self-verifying trace stored in 0G Storage. The web app adds wallet-connect login, INFT minting + delegation management, a run starter, a live spectator dashboard via WebSocket, and an in-browser run verifier.

**Tech Stack:** Solidity ^0.8.24 + Foundry; TypeScript (ESM strict, Node 22+); Fastify + `@modelcontextprotocol/sdk` for the MCP server; SQLite via `better-sqlite3` for in-flight session state; ethers v6 for chain interactions and EIP-712 signing/verification; ws for WebSocket spectator fanout; Next.js 14 App Router with RainbowKit + wagmi for the web frontend; vitest for off-chain tests; forge test for contracts.

**Spec:** [docs/superpowers/specs/2026-05-14-inft-mcp-platform-design.md](../specs/2026-05-14-inft-mcp-platform-design.md)

---

## Phase Overview

| Phase | Scope | Tasks |
|---|---|---|
| **1** | Contracts (AgentINFT + RunRegistryV2 + deploy script) | 1–6 |
| **2** | `@crucible/og-client` wrappers for the new contracts | 7–10 |
| **3** | `@crucible/mcp-server` — the headline new component | 11–23 |
| **4** | Reference agent examples + protocol docs | 24–26 |
| **5** | Web platform additions (wallet-connect, INFT mgmt, live dashboard) | 27–39 |
| **6** | Migration, README updates, end-to-end smoke | 40–43 |

---

## File Structure

**New files (created by this plan):**

```
contracts/src/
  AgentINFT.sol                       (Phase 1)
  RunRegistryV2.sol                   (Phase 1)
contracts/test/
  AgentINFT.t.sol                     (Phase 1)
  RunRegistryV2.t.sol                 (Phase 1)
contracts/script/
  DeployV2Testnet.s.sol               (Phase 1)

packages/og-client/src/
  agent-inft.ts                       (Phase 2)
  run-registry-v2.ts                  (Phase 2)
  publisher-v2.ts                     (Phase 2)

packages/mcp-server/                  (Phase 3 — new workspace package)
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                          (Fastify entry)
    server.ts                         (MCP server setup)
    config.ts                         (env + chain config)
    auth.ts                           (EIP-712 verifier + INFT lookup)
    session.ts                        (per-runId session state)
    engine-adapter.ts                 (wraps @crucible/core for sessions)
    persistence.ts                    (SQLite session store)
    tools/
      list-scenarios.ts
      start-run.ts
      next-tick.ts
      abort-run.ts
      get-my-runs.ts
    spectator.ts                      (WebSocket fanout)
    publish-on-done.ts                (calls og-client publisher)
  test/                               (vitest tests per module)

examples/reference-agent-ts/          (Phase 4)
  package.json
  agent.ts                            (~30 LOC)
  README.md
examples/reference-agent-python/      (Phase 4)
  agent.py
  pyproject.toml
  README.md
docs/protocol/v2.md                   (Phase 4)

apps/web/lib/
  wagmi.ts                            (Phase 5)
  contracts.ts                        (Phase 5)
apps/web/app/
  login/page.tsx                      (Phase 5)
  my-agents/page.tsx + MyAgentsClient.tsx
  agents/[tokenId]/page.tsx + AgentDetailClient.tsx
  agents/[tokenId]/start/page.tsx + RunStarterClient.tsx
  runs/live/[runId]/page.tsx + LiveRunClient.tsx
  verify/[runId]/page.tsx + VerifierClient.tsx
  register/page.tsx
apps/web/components/
  InftMintForm.tsx
  DelegationManager.tsx
  ConnectionGuideTabs.tsx
  LiveRunReplay.tsx
  WalletConnectButton.tsx
```

**Modified files:**

```
contracts/deployed-addresses.json     (Phase 6 — add v2 addresses)
packages/og-client/src/abis.ts        (Phase 2)
packages/og-client/src/index.ts       (Phase 2)
packages/og-client/src/chain-config.ts (Phase 2)
apps/web/app/leaderboard/page.tsx     (Phase 5 — read v2 + legacy v1 toggle)
apps/web/app/scenarios/[id]/LeaderboardTab.tsx (Phase 5)
apps/web/app/layout.tsx               (Phase 5 — RainbowKit provider + wallet button)
apps/web/package.json                 (Phase 5 — add wagmi/rainbowkit/viem)
README.md                             (Phase 6)
```

---

# Phase 1 — Contracts

## Task 1: `AgentINFT` scaffold + ERC-721 basics + `IntelligentData`

**Files:**
- Create: `contracts/src/AgentINFT.sol`
- Test: `contracts/test/AgentINFT.t.sol`

The AgentINFT contract starts as a minimal ERC-721 with the ERC-7857 `IntelligentData` field. Each mint takes `(dataDescription, dataHash)` and assigns sequential `tokenId`s starting at 1.

- [ ] **Step 1: Write failing tests for mint + IntelligentData**

```solidity
// contracts/test/AgentINFT.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentINFT} from "../src/AgentINFT.sol";

contract AgentINFTTest is Test {
    AgentINFT inft;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        inft = new AgentINFT();
    }

    function test_MintAssignsSequentialIds() public {
        vm.startPrank(alice);
        uint256 a = inft.mint("Momentum trader v1", keccak256("brain-v1"));
        uint256 b = inft.mint("Mean-reversion v1", keccak256("brain-v2"));
        vm.stopPrank();
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(inft.ownerOf(1), alice);
        assertEq(inft.ownerOf(2), alice);
        assertEq(inft.balanceOf(alice), 2);
    }

    function test_IntelligentDataReadable() public {
        vm.prank(alice);
        uint256 id = inft.mint("Momentum trader v1", keccak256("brain-v1"));
        (string memory desc, bytes32 h) = inft.intelligentData(id);
        assertEq(desc, "Momentum trader v1");
        assertEq(h, keccak256("brain-v1"));
    }

    function test_NameAndSymbol() public view {
        assertEq(inft.name(), "Crucible Agent INFT");
        assertEq(inft.symbol(), "CAINFT");
    }

    function test_OwnerOfRevertsForUnknownToken() public {
        vm.expectRevert(AgentINFT.TokenDoesNotExist.selector);
        inft.ownerOf(999);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd contracts && forge test --match-contract AgentINFTTest -vv
```

Expected: FAIL — `AgentINFT` source not found.

- [ ] **Step 3: Implement minimal AgentINFT**

```solidity
// contracts/src/AgentINFT.sol
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/AgentINFT.sol contracts/test/AgentINFT.t.sol
git commit -m "feat(contracts): AgentINFT scaffold — ERC-721 basics + IntelligentData

Simplified ERC-7857: mint(dataDescription, dataHash), ownerOf, balanceOf,
intelligentData getter. Plaintext metadata in v1 — encrypted variant is
v3 once 0G TEE oracle is deployed."
```

---

## Task 2: `AgentINFT` delegation (hot/cold key separation)

**Files:**
- Modify: `contracts/src/AgentINFT.sol`
- Modify: `contracts/test/AgentINFT.t.sol`

Adds `delegateAccess`, `revokeAccess`, `isAuthorized`, `getDelegations`. Only the INFT owner can manage delegations. `isAuthorized` returns true if signer is owner OR is in the delegation list.

- [ ] **Step 1: Add failing tests for delegation flow**

```solidity
// Append into AgentINFTTest:

function test_OwnerCanDelegate() public {
    vm.prank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    address hot = address(0xC0FFEE);

    vm.prank(alice);
    inft.delegateAccess(id, hot);

    assertTrue(inft.isAuthorized(id, alice));   // owner always authorized
    assertTrue(inft.isAuthorized(id, hot));     // delegated assistant authorized
    assertFalse(inft.isAuthorized(id, bob));    // unrelated address not authorized

    address[] memory dels = inft.getDelegations(id);
    assertEq(dels.length, 1);
    assertEq(dels[0], hot);
}

function test_NonOwnerCannotDelegate() public {
    vm.prank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    vm.prank(bob);
    vm.expectRevert(AgentINFT.NotOwner.selector);
    inft.delegateAccess(id, address(0xC0FFEE));
}

function test_RevokeRemovesAuthorization() public {
    vm.startPrank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    address hot = address(0xC0FFEE);
    inft.delegateAccess(id, hot);
    inft.revokeAccess(id, hot);
    vm.stopPrank();

    assertFalse(inft.isAuthorized(id, hot));
    address[] memory dels = inft.getDelegations(id);
    assertEq(dels.length, 0);
}

function test_DuplicateDelegationIsNoop() public {
    vm.startPrank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    address hot = address(0xC0FFEE);
    inft.delegateAccess(id, hot);
    inft.delegateAccess(id, hot);  // duplicate — should not double-add
    vm.stopPrank();
    address[] memory dels = inft.getDelegations(id);
    assertEq(dels.length, 1);
}

function test_DelegationCapEnforced() public {
    vm.startPrank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    for (uint256 i = 0; i < 100; i++) {
        inft.delegateAccess(id, address(uint160(0x1000 + i)));
    }
    vm.expectRevert(AgentINFT.DelegationCapReached.selector);
    inft.delegateAccess(id, address(uint160(0x9999)));
    vm.stopPrank();
}
```

- [ ] **Step 2: Verify they fail**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 5 new tests fail (functions undefined).

- [ ] **Step 3: Implement delegation in `AgentINFT.sol`**

Append to `AgentINFT`:

```solidity
    uint256 public constant MAX_DELEGATIONS = 100;

    mapping(uint256 => address[]) private _delegations;
    mapping(uint256 => mapping(address => bool)) private _isDelegated;

    event AccessDelegated(uint256 indexed tokenId, address indexed assistant);
    event AccessRevoked(uint256 indexed tokenId, address indexed assistant);

    error NotOwner();
    error DelegationCapReached();

    function delegateAccess(uint256 tokenId, address assistant) external {
        if (_owners[tokenId] != msg.sender) revert NotOwner();
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
```

- [ ] **Step 4: Verify tests pass**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 9 passing total.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/AgentINFT.sol contracts/test/AgentINFT.t.sol
git commit -m "feat(contracts): AgentINFT — delegateAccess for hot/cold key separation

Owner can authorize multiple operational signing keys (max 100). Crucible
MCP server uses isAuthorized(tokenId, signer) per signed action."
```

---

## Task 3: `AgentINFT` reverse lookup (`tokensOf`)

**Files:**
- Modify: `contracts/src/AgentINFT.sol`
- Modify: `contracts/test/AgentINFT.t.sol`

`tokensOf(owner)` returns the array of tokenIds an address owns. Maintained on mint via `_pushOwned` / `_removeOwned` helpers. (v2 INFTs are non-transferable, so `_removeOwned` is unreachable in v2 — still wired for forward-compatibility with v3 transfers.)

- [ ] **Step 1: Add failing test**

```solidity
function test_TokensOfReturnsAllOwned() public {
    vm.startPrank(alice);
    uint256 a = inft.mint("a", bytes32(0));
    uint256 b = inft.mint("b", bytes32(0));
    uint256 c = inft.mint("c", bytes32(0));
    vm.stopPrank();
    vm.prank(bob);
    uint256 d = inft.mint("d", bytes32(0));

    uint256[] memory aliceTokens = inft.tokensOf(alice);
    assertEq(aliceTokens.length, 3);
    assertEq(aliceTokens[0], a);
    assertEq(aliceTokens[1], b);
    assertEq(aliceTokens[2], c);

    uint256[] memory bobTokens = inft.tokensOf(bob);
    assertEq(bobTokens.length, 1);
    assertEq(bobTokens[0], d);

    uint256[] memory none = inft.tokensOf(address(0xDEAD));
    assertEq(none.length, 0);
}
```

- [ ] **Step 2: Verify it fails**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: FAIL — `tokensOf` undefined.

- [ ] **Step 3: Implement reverse lookup**

Add to `AgentINFT`:

```solidity
    mapping(address => uint256[]) private _ownedTokens;

    function tokensOf(address owner_) external view returns (uint256[] memory) {
        return _ownedTokens[owner_];
    }
```

And modify `mint` to track:

```solidity
    function mint(string calldata dataDescription, bytes32 dataHash) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _ownedTokens[msg.sender].push(tokenId);    // <-- new
        _data[tokenId] = IntelligentData(dataDescription, dataHash);
        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentMinted(tokenId, msg.sender, dataDescription, dataHash);
    }
```

- [ ] **Step 4: Verify it passes**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 10 passing.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/AgentINFT.sol contracts/test/AgentINFT.t.sol
git commit -m "feat(contracts): AgentINFT — tokensOf reverse lookup for /my-agents UI"
```

---

## Task 4: `AgentINFT` ERC-7857 transfer stubs

**Files:**
- Modify: `contracts/src/AgentINFT.sol`
- Modify: `contracts/test/AgentINFT.t.sol`

ERC-7857's `iTransferFrom` requires a TEE oracle — not available on Galileo. v2 contract:
- `iTransferFrom` reverts with `TransfersDisabledV2`
- standard `transferFrom` reverts with same error (would orphan delegations)
- `verifier()` returns `address(0)`

Also exposes a stub for `TransferValidityProof` struct so the interface is shape-compatible with future ERC-7857 tooling.

- [ ] **Step 1: Add failing tests**

```solidity
function test_TransferFromReverts() public {
    vm.prank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    vm.prank(alice);
    vm.expectRevert(AgentINFT.TransfersDisabledV2.selector);
    inft.transferFrom(alice, bob, id);
}

function test_ITransferFromReverts() public {
    vm.prank(alice);
    uint256 id = inft.mint("a", bytes32(0));
    AgentINFT.TransferValidityProof[] memory proofs = new AgentINFT.TransferValidityProof[](0);
    vm.prank(alice);
    vm.expectRevert(AgentINFT.TransfersDisabledV2.selector);
    inft.iTransferFrom(alice, bob, id, proofs);
}

function test_VerifierIsZeroInV2() public view {
    assertEq(inft.verifier(), address(0));
}
```

- [ ] **Step 2: Verify they fail**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 3 new tests fail.

- [ ] **Step 3: Implement transfer stubs**

Add to `AgentINFT`:

```solidity
    /// @dev ERC-7857 TransferValidityProof shape — stubbed in v2.
    struct TransferValidityProof {
        bytes data;
    }

    error TransfersDisabledV2();

    function transferFrom(address, address, uint256) external pure {
        revert TransfersDisabledV2();
    }

    function iTransferFrom(address, address, uint256, TransferValidityProof[] calldata) external pure {
        revert TransfersDisabledV2();
    }

    function verifier() external pure returns (address) {
        return address(0);
    }
```

- [ ] **Step 4: Verify they pass**

```bash
forge test --match-contract AgentINFTTest -vv
```

Expected: 13 passing.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/AgentINFT.sol contracts/test/AgentINFT.t.sol
git commit -m "feat(contracts): AgentINFT — ERC-7857 transfer interface stubs

iTransferFrom and transferFrom both revert; verifier() returns 0.
v2 INFTs are non-transferable — would orphan delegations and there's
no public 0G TEE oracle yet for re-encrypting metadata. v3 enables
transfers when 0G ships the oracle."
```

---

## Task 5: `RunRegistryV2` contract

**Files:**
- Create: `contracts/src/RunRegistryV2.sol`
- Test: `contracts/test/RunRegistryV2.t.sol`

Append-only run registry, references the AgentINFT contract address it was deployed against. Each run carries the bound `tokenId` so verifiers know which INFT to authorize against.

- [ ] **Step 1: Write failing tests**

```solidity
// contracts/test/RunRegistryV2.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentINFT} from "../src/AgentINFT.sol";
import {RunRegistryV2} from "../src/RunRegistryV2.sol";

contract RunRegistryV2Test is Test {
    AgentINFT inft;
    RunRegistryV2 reg;
    address publisher = address(0xCAFE);

    function setUp() public {
        inft = new AgentINFT();
        reg = new RunRegistryV2(address(inft));
        reg.setTrustedAttester(publisher, true);
    }

    function test_PublishRecordsRun() public {
        vm.prank(publisher);
        uint256 runId = reg.publish(
            42,                       // tokenId
            keccak256("choppy-range"),
            keccak256("trace"),
            keccak256("scorecard"),
            420000,                   // sortino e6
            150000,                   // totalReturn e6
            -30000                    // maxDD e6
        );
        assertEq(runId, 1);

        RunRegistryV2.Run memory r = reg.getRun(runId);
        assertEq(r.tokenId, 42);
        assertEq(r.scenarioId, keccak256("choppy-range"));
        assertEq(r.traceRoot, keccak256("trace"));
        assertEq(r.scorecardHash, keccak256("scorecard"));
        assertEq(r.scoreSortinoE6, 420000);
        assertEq(r.recordedBy, publisher);
        assertEq(reg.totalRuns(), 1);
    }

    function test_UntrustedCannotPublish() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(RunRegistryV2.UntrustedAttester.selector);
        reg.publish(1, bytes32(0), bytes32(0), bytes32(0), 0, 0, 0);
    }

    function test_RunsByTokenIndex() public {
        vm.startPrank(publisher);
        reg.publish(7, keccak256("s1"), keccak256("t1"), keccak256("sc1"), 1, 1, -1);
        reg.publish(7, keccak256("s2"), keccak256("t2"), keccak256("sc2"), 2, 2, -2);
        reg.publish(8, keccak256("s1"), keccak256("t3"), keccak256("sc3"), 3, 3, -3);
        vm.stopPrank();

        uint256[] memory ofSeven = reg.getRunsByToken(7);
        assertEq(ofSeven.length, 2);
        assertEq(ofSeven[0], 1);
        assertEq(ofSeven[1], 2);

        uint256[] memory ofEight = reg.getRunsByToken(8);
        assertEq(ofEight.length, 1);
        assertEq(ofEight[0], 3);
    }

    function test_RunsByScenarioIndex() public {
        vm.startPrank(publisher);
        reg.publish(7, keccak256("s1"), keccak256("t1"), keccak256("sc1"), 1, 1, -1);
        reg.publish(8, keccak256("s1"), keccak256("t2"), keccak256("sc2"), 2, 2, -2);
        reg.publish(9, keccak256("s2"), keccak256("t3"), keccak256("sc3"), 3, 3, -3);
        vm.stopPrank();

        uint256[] memory s1 = reg.getRunsByScenario(keccak256("s1"));
        assertEq(s1.length, 2);
    }

    function test_AgentInftAddressExposed() public view {
        assertEq(address(reg.agentINFT()), address(inft));
    }
}
```

- [ ] **Step 2: Verify failure**

```bash
forge test --match-contract RunRegistryV2Test -vv
```

Expected: FAIL — `RunRegistryV2` source not found.

- [ ] **Step 3: Implement `RunRegistryV2.sol`**

```solidity
// contracts/src/RunRegistryV2.sol
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
    error UnknownToken();

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
```

- [ ] **Step 4: Verify tests pass**

```bash
forge test --match-contract RunRegistryV2Test -vv
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/RunRegistryV2.sol contracts/test/RunRegistryV2.t.sol
git commit -m "feat(contracts): RunRegistryV2 — INFT-attested run registry

Each run carries its INFT tokenId; the registry exposes the AgentINFT
address publicly so verifiers know which contract to call isAuthorized
against. Trusted-attester model retained (Crucible's operational wallet
publishes); v3 will move to open publishing with on-chain sig verification."
```

---

## Task 6: Deploy script for v2 contracts

**Files:**
- Create: `contracts/script/DeployV2Testnet.s.sol`

- [ ] **Step 1: Write the deploy script**

```solidity
// contracts/script/DeployV2Testnet.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentINFT} from "../src/AgentINFT.sol";
import {RunRegistryV2} from "../src/RunRegistryV2.sol";

contract DeployV2Testnet is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        AgentINFT inft = new AgentINFT();
        RunRegistryV2 runReg = new RunRegistryV2(address(inft));

        vm.stopBroadcast();

        console.log("AgentINFT:      ", address(inft));
        console.log("RunRegistryV2:  ", address(runReg));
    }
}
```

- [ ] **Step 2: Sanity-build**

```bash
cd contracts && forge build
```

Expected: compiles cleanly.

- [ ] **Step 3: Dry-run deploy (no broadcast)**

```bash
forge script script/DeployV2Testnet.s.sol \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --legacy \
  -vvv
```

Expected: simulated deployment prints two addresses (without on-chain side effects).

- [ ] **Step 4: Live deploy to Galileo (USER ACTION — requires private key + funded wallet)**

```bash
source contracts/.env  # loads DEPLOYER_PRIVATE_KEY
forge script script/DeployV2Testnet.s.sol \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --legacy \
  --broadcast \
  --slow \
  -vvv
```

Capture both addresses from output for use in Phase 2.

- [ ] **Step 5: Append addresses to `contracts/deployed-addresses.json`**

Edit the file to add a `galileoV2` block:

```json
{
  "galileo": { /* unchanged v1 */ },
  "galileoV2": {
    "AgentINFT":     "0x...captured from step 4",
    "RunRegistryV2": "0x...captured from step 4",
    "ScenarioRegistry": "0xfCe793368c623dF55AFE2267B113c7Ae15Cf196F"
  },
  "mainnet": {}
}
```

(`ScenarioRegistry` is reused unchanged from v1 — same bundles, same hashes.)

- [ ] **Step 6: Commit (after live deploy)**

```bash
git add contracts/script/DeployV2Testnet.s.sol contracts/deployed-addresses.json
git commit -m "feat(contracts): deploy script + Galileo v2 addresses

AgentINFT and RunRegistryV2 deployed to 0G Galileo. ScenarioRegistry
reused from v1 (immutable scenario bundles)."
```

---

---

# Phase 2 — `@crucible/og-client` v2 Wrappers

## Task 7: `AgentINFT` ABI + `AgentINFTClient`

**Files:**
- Modify: `packages/og-client/src/abis.ts`
- Create: `packages/og-client/src/agent-inft.ts`
- Create: `packages/og-client/test/agent-inft.test.ts`
- Modify: `packages/og-client/src/index.ts`

- [ ] **Step 1: Add the ABI**

Append to `packages/og-client/src/abis.ts`:

```ts
export const AGENT_INFT_ABI = [
  // events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event AgentMinted(uint256 indexed tokenId, address indexed owner, string dataDescription, bytes32 dataHash)",
  "event AccessDelegated(uint256 indexed tokenId, address indexed assistant)",
  "event AccessRevoked(uint256 indexed tokenId, address indexed assistant)",
  // reads
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function intelligentData(uint256 tokenId) view returns (string, bytes32)",
  "function isAuthorized(uint256 tokenId, address signer) view returns (bool)",
  "function getDelegations(uint256 tokenId) view returns (address[])",
  "function tokensOf(address owner) view returns (uint256[])",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  // writes
  "function mint(string dataDescription, bytes32 dataHash) returns (uint256)",
  "function delegateAccess(uint256 tokenId, address assistant)",
  "function revokeAccess(uint256 tokenId, address assistant)",
] as const;
```

- [ ] **Step 2: Write failing test for the client**

```ts
// packages/og-client/test/agent-inft.test.ts
import { describe, it, expect, vi } from "vitest";
import { AgentINFTClient } from "../src/agent-inft";

describe("AgentINFTClient.mint", () => {
  it("parses tokenId from AgentMinted event", async () => {
    const fakeReceipt = {
      logs: [{ topics: [], data: "0x" }],
    };
    const fakeTx = { hash: "0xabc", wait: () => Promise.resolve(fakeReceipt) };
    const fakeContract: any = {
      mint: vi.fn().mockResolvedValue(fakeTx),
      interface: {
        parseLog: () => ({ name: "AgentMinted", args: [42n, "0xowner", "desc", "0x00"] }),
      },
    };
    const client = new AgentINFTClient.__forTest(fakeContract);
    const out = await client.mint("desc", "0x00" as any);
    expect(out.tokenId).toBe(42n);
    expect(out.txHash).toBe("0xabc");
  });
});
```

- [ ] **Step 3: Run, verify failure**

```bash
cd packages/og-client && pnpm test
```

Expected: FAIL — `AgentINFTClient` undefined.

- [ ] **Step 4: Implement the client**

```ts
// packages/og-client/src/agent-inft.ts
import { ethers } from "ethers";
import { AGENT_INFT_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

type InftContract = ethers.Contract & {
  mint: (desc: string, dataHash: string) => Promise<ethers.TransactionResponse>;
  ownerOf: (tokenId: bigint) => Promise<string>;
  balanceOf: (owner: string) => Promise<bigint>;
  intelligentData: (tokenId: bigint) => Promise<[string, string]>;
  isAuthorized: (tokenId: bigint, signer: string) => Promise<boolean>;
  getDelegations: (tokenId: bigint) => Promise<string[]>;
  tokensOf: (owner: string) => Promise<bigint[]>;
  delegateAccess: (tokenId: bigint, assistant: string) => Promise<ethers.TransactionResponse>;
  revokeAccess: (tokenId: bigint, assistant: string) => Promise<ethers.TransactionResponse>;
};

export class AgentINFTClient {
  private contract: InftContract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.AgentINFT,
      AGENT_INFT_ABI,
      signerOrProvider,
    ) as InftContract;
  }

  /** @internal escape hatch for tests; do not use in production code */
  static __forTest(contract: any): AgentINFTClient {
    const c = Object.create(AgentINFTClient.prototype);
    c.contract = contract;
    return c;
  }

  async mint(dataDescription: string, dataHash: string): Promise<{ tokenId: bigint; txHash: string }> {
    const tx = await this.contract.mint(dataDescription, dataHash);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Mint tx had no receipt");
    const ev = receipt.logs
      .map((l) => { try { return this.contract.interface.parseLog(l); } catch { return null; } })
      .find((e) => e?.name === "AgentMinted");
    if (!ev) throw new Error("AgentMinted event not found in receipt");
    return { tokenId: ev.args[0] as bigint, txHash: tx.hash };
  }

  ownerOf(tokenId: bigint): Promise<string> { return this.contract.ownerOf(tokenId); }
  balanceOf(owner: string): Promise<bigint> { return this.contract.balanceOf(owner); }

  async intelligentData(tokenId: bigint): Promise<{ description: string; dataHash: string }> {
    const [description, dataHash] = await this.contract.intelligentData(tokenId);
    return { description, dataHash };
  }

  isAuthorized(tokenId: bigint, signer: string): Promise<boolean> {
    return this.contract.isAuthorized(tokenId, signer);
  }

  getDelegations(tokenId: bigint): Promise<string[]> {
    return this.contract.getDelegations(tokenId);
  }

  tokensOf(owner: string): Promise<bigint[]> {
    return this.contract.tokensOf(owner);
  }

  async delegateAccess(tokenId: bigint, assistant: string): Promise<string> {
    const tx = await this.contract.delegateAccess(tokenId, assistant);
    await tx.wait();
    return tx.hash;
  }

  async revokeAccess(tokenId: bigint, assistant: string): Promise<string> {
    const tx = await this.contract.revokeAccess(tokenId, assistant);
    await tx.wait();
    return tx.hash;
  }
}
```

- [ ] **Step 5: Verify test passes**

```bash
pnpm test
```

Expected: 1 passing.

- [ ] **Step 6: Export from package index**

Edit `packages/og-client/src/index.ts` — add `export * from "./agent-inft";`.

- [ ] **Step 7: Commit**

```bash
git add packages/og-client/src/abis.ts packages/og-client/src/agent-inft.ts packages/og-client/test/agent-inft.test.ts packages/og-client/src/index.ts
git commit -m "feat(og-client): AgentINFTClient — read/write wrapper for AgentINFT contract"
```

---

## Task 8: `RunRegistryV2` ABI + `RunRegistryV2Client`

**Files:**
- Modify: `packages/og-client/src/abis.ts`
- Create: `packages/og-client/src/run-registry-v2.ts`
- Create: `packages/og-client/test/run-registry-v2.test.ts`
- Modify: `packages/og-client/src/index.ts`

- [ ] **Step 1: Add the ABI**

Append to `abis.ts`:

```ts
export const RUN_REGISTRY_V2_ABI = [
  "event RunPublished(uint256 indexed runId, uint256 indexed tokenId, bytes32 indexed scenarioId, bytes32 traceRoot, bytes32 scorecardHash, int256 scoreSortinoE6)",
  "function publish(uint256 tokenId, bytes32 scenarioId, bytes32 traceRoot, bytes32 scorecardHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6) returns (uint256)",
  "function totalRuns() view returns (uint256)",
  "function getRun(uint256 runId) view returns (tuple(uint256 tokenId, bytes32 scenarioId, bytes32 traceRoot, bytes32 scorecardHash, int256 scoreSortinoE6, int256 totalReturnE6, int256 maxDrawdownE6, uint64 timestamp, address recordedBy))",
  "function getRunsByToken(uint256 tokenId) view returns (uint256[])",
  "function getRunsByScenario(bytes32 scenarioId) view returns (uint256[])",
  "function agentINFT() view returns (address)",
] as const;
```

- [ ] **Step 2: Write failing test**

```ts
// packages/og-client/test/run-registry-v2.test.ts
import { describe, it, expect, vi } from "vitest";
import { RunRegistryV2Client } from "../src/run-registry-v2";

describe("RunRegistryV2Client.publish", () => {
  it("returns runId and tx hash", async () => {
    const fakeTx = {
      hash: "0xfeed",
      wait: () => Promise.resolve({
        logs: [{}],
      }),
    };
    const fakeContract: any = {
      publish: vi.fn().mockResolvedValue(fakeTx),
      interface: {
        parseLog: () => ({ name: "RunPublished", args: [19n, 42n] }),
      },
    };
    const client = RunRegistryV2Client.__forTest(fakeContract);
    const out = await client.publish({
      tokenId: 42n, scenarioId: "0x00" as any, traceRoot: "0x00" as any,
      scorecardHash: "0x00" as any, scoreSortinoE6: 1n, totalReturnE6: 1n, maxDrawdownE6: 1n,
    });
    expect(out.runId).toBe(19n);
    expect(out.txHash).toBe("0xfeed");
  });
});
```

- [ ] **Step 3: Verify failure**

```bash
pnpm test
```

Expected: FAIL.

- [ ] **Step 4: Implement client**

```ts
// packages/og-client/src/run-registry-v2.ts
import { ethers } from "ethers";
import { RUN_REGISTRY_V2_ABI } from "./abis";
import type { ChainConfig } from "./chain-config";

export interface PublishInput {
  tokenId: bigint;
  scenarioId: string;     // bytes32
  traceRoot: string;      // bytes32
  scorecardHash: string;  // bytes32
  scoreSortinoE6: bigint;
  totalReturnE6: bigint;
  maxDrawdownE6: bigint;
}

export interface RunRecord {
  tokenId: bigint;
  scenarioId: string;
  traceRoot: string;
  scorecardHash: string;
  scoreSortinoE6: bigint;
  totalReturnE6: bigint;
  maxDrawdownE6: bigint;
  timestamp: bigint;
  recordedBy: string;
}

export class RunRegistryV2Client {
  private contract: ethers.Contract;

  constructor(cfg: ChainConfig, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(
      cfg.contracts.RunRegistryV2,
      RUN_REGISTRY_V2_ABI,
      signerOrProvider,
    );
  }

  static __forTest(contract: any): RunRegistryV2Client {
    const c = Object.create(RunRegistryV2Client.prototype);
    c.contract = contract;
    return c;
  }

  async publish(input: PublishInput): Promise<{ runId: bigint; txHash: string }> {
    const tx = await this.contract.publish(
      input.tokenId, input.scenarioId, input.traceRoot, input.scorecardHash,
      input.scoreSortinoE6, input.totalReturnE6, input.maxDrawdownE6,
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error("publish tx had no receipt");
    const ev = receipt.logs
      .map((l: ethers.Log) => { try { return this.contract.interface.parseLog(l); } catch { return null; } })
      .find((e: ethers.LogDescription | null) => e?.name === "RunPublished");
    if (!ev) throw new Error("RunPublished event not found in receipt");
    return { runId: ev.args[0] as bigint, txHash: tx.hash };
  }

  async totalRuns(): Promise<bigint> {
    return this.contract.totalRuns();
  }

  async getRun(runId: bigint): Promise<RunRecord> {
    const r = await this.contract.getRun(runId);
    return {
      tokenId: r[0], scenarioId: r[1], traceRoot: r[2], scorecardHash: r[3],
      scoreSortinoE6: r[4], totalReturnE6: r[5], maxDrawdownE6: r[6],
      timestamp: r[7], recordedBy: r[8],
    };
  }

  async getRunsByToken(tokenId: bigint): Promise<bigint[]> {
    return this.contract.getRunsByToken(tokenId);
  }

  async getRunsByScenario(scenarioId: string): Promise<bigint[]> {
    return this.contract.getRunsByScenario(scenarioId);
  }

  async agentINFT(): Promise<string> {
    return this.contract.agentINFT();
  }
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: 1 passing for run-registry-v2 + prior tests still green.

- [ ] **Step 6: Export and commit**

Add `export * from "./run-registry-v2";` to `packages/og-client/src/index.ts`.

```bash
git add packages/og-client/src/abis.ts packages/og-client/src/run-registry-v2.ts packages/og-client/test/run-registry-v2.test.ts packages/og-client/src/index.ts
git commit -m "feat(og-client): RunRegistryV2Client — publish + reads + indexes"
```

---

## Task 9: Extend `chain-config.ts` for v2 contracts

**Files:**
- Modify: `packages/og-client/src/chain-config.ts`

- [ ] **Step 1: Update ChainConfig types and loader**

Open `packages/og-client/src/chain-config.ts`. Extend the `ChainConfig.contracts` type:

```ts
export interface ChainConfig {
  network: Network;
  rpcUrl: string;
  chainId: number;
  storageIndexer: string;
  contracts: {
    // v1 (legacy, still queryable)
    ScenarioRegistry: string;
    AgentRegistry: string;
    RunRegistry: string;
    // v2 (active)
    AgentINFT: string;
    RunRegistryV2: string;
  };
}
```

In `loadChainConfig`, when reading `deployed-addresses.json`, prefer the `galileoV2` block for v2 fields and fall back to `galileo` for v1 fields. Pseudo-edit:

```ts
const all = JSON.parse(await readFile(ADDRESSES_PATH, "utf8"));
const v1 = all[network] ?? {};
const v2 = all[`${network}V2`] ?? {};
return {
  network, rpcUrl, chainId, storageIndexer,
  contracts: {
    ScenarioRegistry: v2.ScenarioRegistry ?? v1.ScenarioRegistry,
    AgentRegistry: v1.AgentRegistry,
    RunRegistry: v1.RunRegistry,
    AgentINFT: v2.AgentINFT,
    RunRegistryV2: v2.RunRegistryV2,
  },
};
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/og-client && pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/og-client/src/chain-config.ts
git commit -m "feat(og-client): chain-config supports v1 + v2 contract addresses simultaneously"
```

---

## Task 10: `publishRunV2` helper

**Files:**
- Create: `packages/og-client/src/publisher-v2.ts`
- Modify: `packages/og-client/src/index.ts`

Bundles the trace upload to 0G Storage + the on-chain `RunRegistryV2.publish` call. Mirrors v1's `publisher.ts` but tokenId-based.

- [ ] **Step 1: Implement helper**

```ts
// packages/og-client/src/publisher-v2.ts
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { ethers } from "ethers";
import { uploadFile } from "./storage";
import { RunRegistryV2Client } from "./run-registry-v2";
import { loadChainConfig, type Network } from "./chain-config";

export interface PublishRunV2Input {
  runDir: string;        // dir containing trace.jsonl + scorecard.json
  tokenId: bigint;
  scenarioId: string;    // bytes32 (e.g. keccak256 of scenario id string)
  network: Network;
  privateKey: string;
}

export interface PublishRunV2Result {
  runId: bigint;
  txHash: string;
  traceRoot: string;
}

export async function publishRunV2(opts: PublishRunV2Input): Promise<PublishRunV2Result> {
  const cfg = await loadChainConfig(opts.network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(opts.privateKey, provider);

  const tracePath = path.join(opts.runDir, "trace.jsonl");
  const scorePath = path.join(opts.runDir, "scorecard.json");
  const traceBytes = await readFile(tracePath);
  const scoreBytes = await readFile(scorePath);

  const traceRoot = await uploadFile(cfg, traceBytes, "trace.jsonl");
  const scorecardHash = "0x" + createHash("sha256").update(scoreBytes).digest("hex");

  const score = JSON.parse(scoreBytes.toString()) as {
    sortino: number; totalReturn: number; maxDrawdown: number;
  };
  const e6 = (n: number) => BigInt(Math.round(n * 1_000_000));

  const client = new RunRegistryV2Client(cfg, signer);
  const { runId, txHash } = await client.publish({
    tokenId: opts.tokenId,
    scenarioId: opts.scenarioId,
    traceRoot,
    scorecardHash,
    scoreSortinoE6: e6(score.sortino),
    totalReturnE6: e6(score.totalReturn),
    maxDrawdownE6: e6(score.maxDrawdown),
  });
  return { runId, txHash, traceRoot };
}
```

- [ ] **Step 2: Export**

Add `export * from "./publisher-v2";` to `packages/og-client/src/index.ts`.

- [ ] **Step 3: Typecheck**

```bash
cd packages/og-client && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/og-client/src/publisher-v2.ts packages/og-client/src/index.ts
git commit -m "feat(og-client): publishRunV2 — bundle trace upload + RunRegistryV2.publish"
```

---

# Phase 3 — `@crucible/mcp-server` (the Headline New Component)

## Task 11: Bootstrap `@crucible/mcp-server` package

**Files:**
- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/vitest.config.ts`
- Create: `packages/mcp-server/src/index.ts` (placeholder)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crucible/mcp-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "bin": { "crucible-mcp": "./src/index.ts" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@crucible/core": "workspace:*",
    "@crucible/og-client": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fastify": "^4.28.0",
    "@fastify/websocket": "^10.0.0",
    "better-sqlite3": "^11.3.0",
    "ethers": "^6.13.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

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

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["test/**/*.test.ts", "src/**/*.test.ts"] } });
```

- [ ] **Step 4: Write placeholder `src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install + typecheck**

```bash
pnpm install
cd packages/mcp-server && pnpm typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/mcp-server pnpm-lock.yaml
git commit -m "feat(mcp-server): bootstrap @crucible/mcp-server workspace package"
```

---

## Task 12: EIP-712 verifier module

**Files:**
- Create: `packages/mcp-server/src/auth.ts`
- Create: `packages/mcp-server/src/auth.test.ts`

Recovers a signer from an EIP-712 signature and looks up tokenIds via `AgentINFTClient`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/mcp-server/src/auth.test.ts
import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { recoverActionSigner, ACTION_TYPES, buildDomain } from "./auth";

describe("recoverActionSigner", () => {
  it("recovers the signer of a valid EIP-712 Action", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = {
      runId: "0x" + "11".repeat(32),
      tickId: 1,
      kind: "market_buy",
      qty: 100n,
      reasoning: "starter long",
      nonce: 1n,
    };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const recovered = recoverActionSigner(domain, action, sig);
    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("returns a different address if signature is wrong", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "noop", qty: 0n, reasoning: "", nonce: 1n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const tampered = { ...action, kind: "market_buy" };
    const recovered = recoverActionSigner(domain, tampered, sig);
    expect(recovered.toLowerCase()).not.toBe(wallet.address.toLowerCase());
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
cd packages/mcp-server && pnpm test
```

Expected: FAIL.

- [ ] **Step 3: Implement `auth.ts`**

```ts
// packages/mcp-server/src/auth.ts
import { ethers } from "ethers";
import { AgentINFTClient } from "@crucible/og-client";

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export const ACTION_TYPES = {
  Action: [
    { name: "runId",     type: "bytes32" },
    { name: "tickId",    type: "uint32"  },
    { name: "kind",      type: "string"  },
    { name: "qty",       type: "uint256" },
    { name: "reasoning", type: "string"  },
    { name: "nonce",     type: "uint256" },
  ],
} as const;

export const START_RUN_TYPES = {
  StartRun: [
    { name: "scenarioId", type: "string"  },
    { name: "tokenId",    type: "uint256" },
    { name: "nonce",      type: "uint256" },
  ],
} as const;

export const ABORT_RUN_TYPES = {
  AbortRun: [
    { name: "runId",  type: "bytes32" },
    { name: "reason", type: "string"  },
    { name: "nonce",  type: "uint256" },
  ],
} as const;

export function buildDomain(chainId: number, verifyingContract: string): EIP712Domain {
  return { name: "CrucibleBench", version: "2", chainId, verifyingContract };
}

export interface Action {
  runId: string; tickId: number; kind: string; qty: bigint; reasoning: string; nonce: bigint;
}

export function recoverActionSigner(domain: EIP712Domain, action: Action, signature: string): string {
  return ethers.verifyTypedData(domain, ACTION_TYPES, action, signature);
}

export interface StartRunPayload {
  scenarioId: string; tokenId: bigint; nonce: bigint;
}

export function recoverStartRunSigner(domain: EIP712Domain, payload: StartRunPayload, signature: string): string {
  return ethers.verifyTypedData(domain, START_RUN_TYPES, payload, signature);
}

export interface AbortRunPayload {
  runId: string; reason: string; nonce: bigint;
}

export function recoverAbortRunSigner(domain: EIP712Domain, payload: AbortRunPayload, signature: string): string {
  return ethers.verifyTypedData(domain, ABORT_RUN_TYPES, payload, signature);
}

export interface AuthorizeOpts {
  inft: AgentINFTClient;
  tokenId: bigint;
  signer: string;
}

export async function isAuthorizedForToken({ inft, tokenId, signer }: AuthorizeOpts): Promise<boolean> {
  return inft.isAuthorized(tokenId, signer);
}
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm test
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/auth.ts packages/mcp-server/src/auth.test.ts
git commit -m "feat(mcp-server): EIP-712 verifier (Action / StartRun / AbortRun) + INFT auth"
```

---

## Task 13: Engine session adapter

**Files:**
- Create: `packages/mcp-server/src/engine-adapter.ts`
- Create: `packages/mcp-server/src/engine-adapter.test.ts`

Wraps `@crucible/core`'s scenario engine to expose a per-session API: `init(scenarioId)`, `currentObservation()`, `applyAction(action)`, `nextObservation()`, `isDone()`, `finalize()` (returns scorecard + trace bytes).

- [ ] **Step 1: Write failing test against fake scenario**

```ts
// packages/mcp-server/src/engine-adapter.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EngineSession } from "./engine-adapter";

function fixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "scen-"));
  writeFileSync(path.join(dir, "manifest.yaml"), `
id: tiny
asset: ETH-USDC
total_ticks: 3
starting_cash_usd: 10000
starting_position: 0
`);
  writeFileSync(path.join(dir, "ticks.jsonl"),
    JSON.stringify({ tickId: 1, ts: 1, midPrice: 100, bidPrice: 99.9, askPrice: 100.1, depth: 1000 }) + "\n" +
    JSON.stringify({ tickId: 2, ts: 2, midPrice: 101, bidPrice: 100.9, askPrice: 101.1, depth: 1000 }) + "\n" +
    JSON.stringify({ tickId: 3, ts: 3, midPrice: 102, bidPrice: 101.9, askPrice: 102.1, depth: 1000 }) + "\n"
  );
  writeFileSync(path.join(dir, "news.jsonl"), "");
  writeFileSync(path.join(dir, "starting_state.json"), JSON.stringify({ cash: 10000, position: 0 }));
  return dir;
}

describe("EngineSession", () => {
  it("walks through ticks until done", async () => {
    const dir = fixture();
    const sess = await EngineSession.init({ scenarioDir: dir });
    expect(sess.isDone()).toBe(false);
    const obs1 = sess.currentObservation();
    expect(obs1.tickId).toBe(1);
    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "" });
    sess.advance();
    expect(sess.currentObservation().tickId).toBe(2);
    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "" });
    sess.advance();
    sess.applyAction({ kind: "noop", qty: 0n, reasoning: "" });
    sess.advance();
    expect(sess.isDone()).toBe(true);
    const result = sess.finalize();
    expect(result.scorecard).toBeDefined();
    expect(typeof result.traceJsonl).toBe("string");
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm test
```

- [ ] **Step 3: Implement `engine-adapter.ts`**

```ts
// packages/mcp-server/src/engine-adapter.ts
import { loadScenarioBundle, runEngineTick, computeScorecard, /* etc. — adjust to actual core exports */ } from "@crucible/core";
import type { Tick, Action as CoreAction, Scorecard } from "@crucible/core";

export interface SessionAction {
  kind: "market_buy" | "market_sell" | "noop";
  qty: bigint;
  reasoning: string;
  signature?: string;
  signer?: string;
}

export interface Observation {
  tickId: number;
  price: number;
  bid: number;
  ask: number;
  position: number;
  cash: number;
  equity: number;
  news: Array<{ at: number; headline: string; source?: string }>;
  ticksRemaining: number;
}

export interface InitOpts { scenarioDir: string; }

export class EngineSession {
  private ticks: Tick[];
  private cursor = 0;
  private cash: number;
  private position: number;
  private trace: string[] = [];
  private news: any[];

  private constructor(ticks: Tick[], news: any[], cash: number, position: number) {
    this.ticks = ticks;
    this.news = news;
    this.cash = cash;
    this.position = position;
  }

  static async init(opts: InitOpts): Promise<EngineSession> {
    const bundle = await loadScenarioBundle(opts.scenarioDir);
    return new EngineSession(bundle.ticks, bundle.news, bundle.startingCashUsd, bundle.startingPosition);
  }

  isDone(): boolean { return this.cursor >= this.ticks.length; }

  currentObservation(): Observation {
    const tick = this.ticks[this.cursor];
    if (!tick) throw new Error("no current tick — session done");
    return {
      tickId: tick.tickId, price: tick.midPrice, bid: tick.bidPrice, ask: tick.askPrice,
      position: this.position, cash: this.cash,
      equity: this.cash + this.position * tick.midPrice,
      news: this.news.filter((n) => n.tickId === tick.tickId),
      ticksRemaining: this.ticks.length - this.cursor,
    };
  }

  applyAction(action: SessionAction): { fillPrice?: number; fillQty?: number } {
    const tick = this.ticks[this.cursor];
    if (!tick) throw new Error("no current tick");
    const qty = Number(action.qty) / 1e18;
    let fillPrice: number | undefined;
    let fillQty: number | undefined;
    if (action.kind === "market_buy") {
      fillPrice = tick.askPrice;
      fillQty = qty;
      this.cash -= fillPrice * qty;
      this.position += qty;
    } else if (action.kind === "market_sell") {
      fillPrice = tick.bidPrice;
      fillQty = qty;
      this.cash += fillPrice * qty;
      this.position -= qty;
    }
    this.trace.push(JSON.stringify({
      tickId: tick.tickId,
      observation: this.currentObservation(),
      action: { kind: action.kind, qty: action.qty.toString(), reasoning: action.reasoning },
      signature: action.signature ?? null,
      signer: action.signer ?? null,
    }));
    return { fillPrice, fillQty };
  }

  advance(): void { this.cursor += 1; }

  finalize(): { scorecard: Scorecard; traceJsonl: string } {
    const scorecard = computeScorecard({
      ticks: this.ticks,
      finalCash: this.cash,
      finalPosition: this.position,
      finalPrice: this.ticks[this.ticks.length - 1]!.midPrice,
    });
    return { scorecard, traceJsonl: this.trace.join("\n") + "\n" };
  }
}
```

(Note: `loadScenarioBundle`, `Tick`, `Scorecard`, `computeScorecard` already exist in `@crucible/core`. If function names differ, the engineer adjusts. If `loadScenarioBundle` doesn't exist by that exact name, use the equivalent loader exported by `@crucible/core` — `grep "export" packages/core/src/index.ts` to confirm.)

- [ ] **Step 4: Verify test passes**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/engine-adapter.ts packages/mcp-server/src/engine-adapter.test.ts
git commit -m "feat(mcp-server): EngineSession adapter — per-runId state + trace recorder"
```

---

## Task 14: Session state manager (per-`runId` registry)

**Files:**
- Create: `packages/mcp-server/src/session.ts`
- Create: `packages/mcp-server/src/session.test.ts`

In-memory registry of active sessions, each with: bound `tokenId`, monotonic nonce, timeout deadline, EngineSession instance, latest observation, status. Owns timeout timers.

- [ ] **Step 1: Failing test**

```ts
// packages/mcp-server/src/session.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionRegistry } from "./session";
import { EngineSession } from "./engine-adapter";

function mockEngine(): EngineSession {
  return {
    isDone: vi.fn(() => false),
    currentObservation: vi.fn(() => ({ tickId: 1 } as any)),
    applyAction: vi.fn(() => ({})),
    advance: vi.fn(),
    finalize: vi.fn(() => ({ scorecard: { sortino: 0 } as any, traceJsonl: "" })),
  } as unknown as EngineSession;
}

describe("SessionRegistry", () => {
  it("creates and retrieves a session", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ tokenId: 42n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    const sess = reg.get(runId);
    expect(sess.tokenId).toBe(42n);
    expect(sess.expectedNonce).toBe(0n);
  });

  it("rejects nonce reuse and gaps", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ tokenId: 42n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    const sess = reg.get(runId);
    expect(reg.checkAndAdvanceNonce(runId, 1n)).toBe(true);
    expect(reg.checkAndAdvanceNonce(runId, 1n)).toBe(false); // duplicate
    expect(reg.checkAndAdvanceNonce(runId, 3n)).toBe(false); // gap
    expect(reg.checkAndAdvanceNonce(runId, 2n)).toBe(true);
  });

  it("removes session on close", () => {
    const reg = new SessionRegistry();
    const runId = reg.create({ tokenId: 1n, signer: "0xAB", scenarioId: "s", engine: mockEngine() });
    reg.close(runId);
    expect(() => reg.get(runId)).toThrow();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm test
```

- [ ] **Step 3: Implement `session.ts`**

```ts
// packages/mcp-server/src/session.ts
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import type { EngineSession } from "./engine-adapter";

export type SessionStatus = "active" | "completed" | "aborted";

export interface Session {
  runId: string;            // 0x-prefixed bytes32
  tokenId: bigint;
  signer: string;
  scenarioId: string;
  engine: EngineSession;
  expectedNonce: bigint;
  status: SessionStatus;
  createdAt: number;
  lastTickAt: number;
  events: EventEmitter;     // emits "tick" / "action" / "done" / "abort" — for spectator fanout
}

export interface CreateOpts {
  tokenId: bigint;
  signer: string;
  scenarioId: string;
  engine: EngineSession;
}

export class SessionRegistry {
  private byRunId = new Map<string, Session>();

  create(opts: CreateOpts): string {
    const runId = "0x" + randomBytes(32).toString("hex");
    const sess: Session = {
      runId, tokenId: opts.tokenId, signer: opts.signer, scenarioId: opts.scenarioId,
      engine: opts.engine, expectedNonce: 0n, status: "active",
      createdAt: Date.now(), lastTickAt: Date.now(), events: new EventEmitter(),
    };
    this.byRunId.set(runId, sess);
    return runId;
  }

  get(runId: string): Session {
    const s = this.byRunId.get(runId);
    if (!s) throw new Error(`Unknown runId: ${runId}`);
    return s;
  }

  /** Atomically check the next nonce is exactly expected+1 and advance. */
  checkAndAdvanceNonce(runId: string, nonce: bigint): boolean {
    const s = this.get(runId);
    if (nonce !== s.expectedNonce + 1n) return false;
    s.expectedNonce = nonce;
    s.lastTickAt = Date.now();
    return true;
  }

  markCompleted(runId: string) { this.get(runId).status = "completed"; }
  markAborted(runId: string) { this.get(runId).status = "aborted"; }

  close(runId: string) { this.byRunId.delete(runId); }

  listForToken(tokenId: bigint): Session[] {
    return [...this.byRunId.values()].filter((s) => s.tokenId === tokenId);
  }
}
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/session.ts packages/mcp-server/src/session.test.ts
git commit -m "feat(mcp-server): SessionRegistry — runId state, monotonic nonce, status tracking"
```

---

## Task 15: SQLite persistence for in-flight sessions

**Files:**
- Create: `packages/mcp-server/src/persistence.ts`

Persists session metadata + trace lines so a server restart doesn't lose in-flight runs. Uses `better-sqlite3` synchronously (one DB writer per process is fine for single-instance v2).

- [ ] **Step 1: Implement persistence module**

```ts
// packages/mcp-server/src/persistence.ts
import Database from "better-sqlite3";
import path from "node:path";

export interface PersistedSession {
  runId: string;
  tokenId: string;     // bigint as decimal string
  signer: string;
  scenarioId: string;
  status: "active" | "completed" | "aborted";
  expectedNonce: string;
  createdAt: number;
  lastTickAt: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  run_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  signer TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  status TEXT NOT NULL,
  expected_nonce TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_tick_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trace_lines (
  run_id TEXT NOT NULL,
  tick_id INTEGER NOT NULL,
  line TEXT NOT NULL,
  PRIMARY KEY (run_id, tick_id)
);
`;

export class PersistenceStore {
  private db: Database.Database;

  constructor(opts: { path?: string } = {}) {
    const p = opts.path ?? path.resolve(process.cwd(), "mcp-server.sqlite");
    this.db = new Database(p);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  upsertSession(s: PersistedSession) {
    this.db.prepare(`
      INSERT INTO sessions (run_id, token_id, signer, scenario_id, status, expected_nonce, created_at, last_tick_at)
      VALUES (@runId, @tokenId, @signer, @scenarioId, @status, @expectedNonce, @createdAt, @lastTickAt)
      ON CONFLICT(run_id) DO UPDATE SET
        status=excluded.status,
        expected_nonce=excluded.expected_nonce,
        last_tick_at=excluded.last_tick_at
    `).run(s);
  }

  appendTrace(runId: string, tickId: number, line: string) {
    this.db.prepare(`INSERT OR REPLACE INTO trace_lines (run_id, tick_id, line) VALUES (?, ?, ?)`).run(runId, tickId, line);
  }

  loadActiveSessions(): PersistedSession[] {
    const rows = this.db.prepare(`SELECT * FROM sessions WHERE status = 'active'`).all() as any[];
    return rows.map((r) => ({
      runId: r.run_id, tokenId: r.token_id, signer: r.signer, scenarioId: r.scenario_id,
      status: r.status, expectedNonce: r.expected_nonce, createdAt: r.created_at, lastTickAt: r.last_tick_at,
    }));
  }

  loadTrace(runId: string): string {
    const rows = this.db.prepare(`SELECT line FROM trace_lines WHERE run_id = ? ORDER BY tick_id ASC`).all(runId) as any[];
    return rows.map((r) => r.line).join("\n") + (rows.length ? "\n" : "");
  }

  deleteSession(runId: string) {
    this.db.prepare(`DELETE FROM sessions WHERE run_id = ?`).run(runId);
    this.db.prepare(`DELETE FROM trace_lines WHERE run_id = ?`).run(runId);
  }

  close() { this.db.close(); }
}
```

- [ ] **Step 2: Smoke-test in repl** (skip writing tests for this — it's thin SQL):

```bash
cd packages/mcp-server && pnpm exec tsx -e "
import { PersistenceStore } from './src/persistence';
const s = new PersistenceStore({ path: '/tmp/test.db' });
s.upsertSession({ runId:'0xabc', tokenId:'42', signer:'0xAB', scenarioId:'s', status:'active', expectedNonce:'0', createdAt:1, lastTickAt:1 });
s.appendTrace('0xabc', 1, JSON.stringify({tickId:1}));
console.log(s.loadActiveSessions(), s.loadTrace('0xabc'));
s.close();
"
```

Expected: prints session row + trace line.

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/persistence.ts
git commit -m "feat(mcp-server): SQLite persistence for in-flight sessions + traces"
```

---

## Task 16: MCP tool — `crucible.list_scenarios`

**Files:**
- Create: `packages/mcp-server/src/tools/list-scenarios.ts`

Reads the scenarios directory and returns the manifest summaries. (The MCP server runs alongside the repo; it reads the same `scenarios/` directory the web app reads.)

- [ ] **Step 1: Implement**

```ts
// packages/mcp-server/src/tools/list-scenarios.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const ScenarioSummary = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().int().min(1).max(5),
  kind: z.enum(["historical", "synthetic"]),
  totalTicks: z.number().int().positive(),
  asset: z.string(),
  description: z.string(),
});
export type ScenarioSummary = z.infer<typeof ScenarioSummary>;

export async function listScenarios(scenariosDir: string): Promise<ScenarioSummary[]> {
  const entries = await readdir(scenariosDir, { withFileTypes: true });
  const summaries: ScenarioSummary[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(scenariosDir, e.name, "manifest.yaml");
    try {
      const raw = await readFile(manifestPath, "utf8");
      const m = yaml.load(raw) as any;
      summaries.push(ScenarioSummary.parse({
        id: m.id, name: m.name ?? m.id,
        difficulty: m.difficulty ?? 3,
        kind: m.kind ?? "synthetic",
        totalTicks: m.total_ticks,
        asset: m.asset,
        description: m.description ?? "",
      }));
    } catch {
      // skip directories without a valid manifest
    }
  }
  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 2: Quick smoke**

```bash
pnpm exec tsx -e "import {listScenarios} from './src/tools/list-scenarios.ts'; console.log(await listScenarios('../../scenarios'));"
```

Expected: prints array of scenario summaries.

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/tools/list-scenarios.ts
git commit -m "feat(mcp-server): tool — list_scenarios reads scenarios/ directory"
```

---

## Task 17: MCP tool — `crucible.start_run`

**Files:**
- Create: `packages/mcp-server/src/tools/start-run.ts`
- Create: `packages/mcp-server/src/tools/start-run.test.ts`

Verifies the `StartRun` signature, looks up the INFT, creates a `Session` via the registry, returns the first observation.

- [ ] **Step 1: Failing test (mocking INFT + registry)**

```ts
// packages/mcp-server/src/tools/start-run.test.ts
import { describe, it, expect, vi } from "vitest";
import { ethers } from "ethers";
import { handleStartRun } from "./start-run";
import { buildDomain, START_RUN_TYPES } from "../auth";

describe("handleStartRun", () => {
  it("rejects an unauthorized signer", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const payload = { scenarioId: "tiny", tokenId: 42n, nonce: 1n };
    const sig = await wallet.signTypedData(domain, START_RUN_TYPES, payload);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(false) } as any;
    const reg: any = { create: vi.fn() };
    const startEngine = vi.fn();
    await expect(handleStartRun({
      domain, inft, registry: reg, startEngine,
      input: { scenarioId: "tiny", tokenId: "42", nonce: "1", signature: sig, signer: wallet.address },
    })).rejects.toThrow(/UNAUTHORIZED/);
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// packages/mcp-server/src/tools/start-run.ts
import path from "node:path";
import { z } from "zod";
import type { AgentINFTClient } from "@crucible/og-client";
import { recoverStartRunSigner, type EIP712Domain } from "../auth";
import { EngineSession } from "../engine-adapter";
import type { SessionRegistry } from "../session";

export const StartRunInput = z.object({
  scenarioId: z.string(),
  tokenId: z.string(),     // decimal as string (uint256 won't fit in number)
  nonce: z.string(),
  signature: z.string(),
  signer: z.string(),
});
export type StartRunInputT = z.infer<typeof StartRunInput>;

export interface HandleStartRunDeps {
  domain: EIP712Domain;
  inft: AgentINFTClient;
  registry: SessionRegistry;
  scenariosDir?: string;   // defaults to repo's scenarios/
  startEngine?: (scenarioDir: string) => Promise<EngineSession>;
  input: StartRunInputT;
}

export async function handleStartRun(deps: HandleStartRunDeps) {
  const { domain, inft, registry, input } = deps;
  const scenariosDir = deps.scenariosDir ?? path.resolve(process.cwd(), "scenarios");
  const startEngine = deps.startEngine ?? ((dir: string) => EngineSession.init({ scenarioDir: dir }));

  const tokenId = BigInt(input.tokenId);
  const nonce = BigInt(input.nonce);
  const recovered = recoverStartRunSigner(
    domain,
    { scenarioId: input.scenarioId, tokenId, nonce },
    input.signature,
  );
  if (recovered.toLowerCase() !== input.signer.toLowerCase()) {
    throw new Error("BAD_SIGNATURE");
  }

  const ok = await inft.isAuthorized(tokenId, recovered);
  if (!ok) throw new Error("UNAUTHORIZED");

  const scenarioDir = path.join(scenariosDir, input.scenarioId);
  const engine = await startEngine(scenarioDir);
  const runId = registry.create({ tokenId, signer: recovered, scenarioId: input.scenarioId, engine });
  const obs = engine.currentObservation();

  return {
    runId,
    ticksRemaining: obs.ticksRemaining,
    observation: obs,
    spectatorUrl: `https://cruciblebench.xyz/runs/live/${runId}`,
  };
}
```

- [ ] **Step 4: Verify test passes**

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/tools/start-run.ts packages/mcp-server/src/tools/start-run.test.ts
git commit -m "feat(mcp-server): tool — start_run (auth + INFT lookup + engine init + session create)"
```

---

## Task 18: MCP tool — `crucible.next_tick`

**Files:**
- Create: `packages/mcp-server/src/tools/next-tick.ts`
- Create: `packages/mcp-server/src/tools/next-tick.test.ts`

The hot path. Verifies signature, checks nonce, checks INFT auth (still authorized), applies action, advances engine, returns next observation OR `done` with scorecard.

- [ ] **Step 1: Failing test**

```ts
// packages/mcp-server/src/tools/next-tick.test.ts
import { describe, it, expect, vi } from "vitest";
import { ethers } from "ethers";
import { handleNextTick } from "./next-tick";
import { buildDomain, ACTION_TYPES } from "../auth";

describe("handleNextTick", () => {
  it("rejects bad nonce", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "noop", qty: 0n, reasoning: "", nonce: 5n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const sess: any = {
      tokenId: 1n, signer: wallet.address.toLowerCase(),
      engine: {
        applyAction: vi.fn(), advance: vi.fn(), isDone: () => false,
        currentObservation: () => ({ tickId: 2, ticksRemaining: 1 }),
      },
    };
    const registry: any = {
      get: () => sess,
      checkAndAdvanceNonce: vi.fn().mockReturnValue(false),  // bad nonce
    };
    await expect(handleNextTick({
      domain, inft, registry,
      input: {
        runId: action.runId, tickId: 1, kind: "noop", qty: "0",
        reasoning: "", nonce: "5", signature: sig, signer: wallet.address,
      },
    })).rejects.toThrow(/BAD_NONCE/);
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// packages/mcp-server/src/tools/next-tick.ts
import { z } from "zod";
import type { AgentINFTClient } from "@crucible/og-client";
import { recoverActionSigner, type EIP712Domain } from "../auth";
import type { SessionRegistry } from "../session";

export const NextTickInput = z.object({
  runId: z.string(),
  tickId: z.number().int().nonnegative(),
  kind: z.enum(["market_buy", "market_sell", "noop"]),
  qty: z.string(),
  reasoning: z.string().default(""),
  nonce: z.string(),
  signature: z.string(),
  signer: z.string(),
});
export type NextTickInputT = z.infer<typeof NextTickInput>;

export interface HandleNextTickDeps {
  domain: EIP712Domain;
  inft: AgentINFTClient;
  registry: SessionRegistry;
  input: NextTickInputT;
}

export async function handleNextTick(deps: HandleNextTickDeps) {
  const { domain, inft, registry, input } = deps;
  const session = registry.get(input.runId);

  const action = {
    runId: input.runId, tickId: input.tickId, kind: input.kind,
    qty: BigInt(input.qty), reasoning: input.reasoning, nonce: BigInt(input.nonce),
  };
  const recovered = recoverActionSigner(domain, action, input.signature);
  if (recovered.toLowerCase() !== input.signer.toLowerCase()) throw new Error("BAD_SIGNATURE");
  if (recovered.toLowerCase() !== session.signer.toLowerCase()) {
    // session-bound signer changed mid-run — re-check INFT in case delegation changed
    const ok = await inft.isAuthorized(session.tokenId, recovered);
    if (!ok) throw new Error("UNAUTHORIZED_SIGNER");
    session.signer = recovered;
  }
  if (!registry.checkAndAdvanceNonce(input.runId, BigInt(input.nonce))) throw new Error("BAD_NONCE");

  const fill = session.engine.applyAction({
    kind: input.kind, qty: BigInt(input.qty), reasoning: input.reasoning,
    signature: input.signature, signer: input.signer,
  });
  session.engine.advance();
  session.events.emit("tick", { tickId: input.tickId, action: input, fill });

  if (session.engine.isDone()) {
    const { scorecard, traceJsonl } = session.engine.finalize();
    session.events.emit("done", { scorecard });
    return {
      tickId: input.tickId,
      fill,
      ticksRemaining: 0,
      done: true,
      scorecard,
      traceJsonl,                 // server's auto-publisher will consume this; not echoed to wire
    };
  }

  const obs = session.engine.currentObservation();
  return {
    tickId: input.tickId,
    fill,
    observation: obs,
    ticksRemaining: obs.ticksRemaining,
    done: false,
  };
}
```

- [ ] **Step 4: Verify test passes**

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/tools/next-tick.ts packages/mcp-server/src/tools/next-tick.test.ts
git commit -m "feat(mcp-server): tool — next_tick (verify sig+nonce+auth, apply, advance, return)"
```

---

## Task 19: MCP tools — `abort_run` + `get_my_runs`

**Files:**
- Create: `packages/mcp-server/src/tools/abort-run.ts`
- Create: `packages/mcp-server/src/tools/get-my-runs.ts`

- [ ] **Step 1: Implement `abort-run.ts`**

```ts
// packages/mcp-server/src/tools/abort-run.ts
import { z } from "zod";
import { recoverAbortRunSigner, type EIP712Domain } from "../auth";
import type { SessionRegistry } from "../session";

export const AbortRunInput = z.object({
  runId: z.string(),
  reason: z.string().default(""),
  nonce: z.string(),
  signature: z.string(),
  signer: z.string(),
});
export type AbortRunInputT = z.infer<typeof AbortRunInput>;

export async function handleAbortRun(opts: {
  domain: EIP712Domain; registry: SessionRegistry; input: AbortRunInputT;
}) {
  const { domain, registry, input } = opts;
  const session = registry.get(input.runId);
  const recovered = recoverAbortRunSigner(domain, {
    runId: input.runId, reason: input.reason, nonce: BigInt(input.nonce),
  }, input.signature);
  if (recovered.toLowerCase() !== session.signer.toLowerCase()) throw new Error("UNAUTHORIZED_SIGNER");
  registry.markAborted(input.runId);
  session.events.emit("abort", { reason: input.reason });
  return { aborted: true };
}
```

- [ ] **Step 2: Implement `get-my-runs.ts`**

```ts
// packages/mcp-server/src/tools/get-my-runs.ts
import type { RunRegistryV2Client } from "@crucible/og-client";

export async function handleGetMyRuns(opts: {
  registry: RunRegistryV2Client;
  tokenId: bigint;
}) {
  const ids = await opts.registry.getRunsByToken(opts.tokenId);
  const records = await Promise.all(ids.map((id) => opts.registry.getRun(id)));
  return records.map((r, i) => ({
    runId: ids[i].toString(),
    scenarioId: r.scenarioId,
    scoreSortinoE6: r.scoreSortinoE6.toString(),
    totalReturnE6: r.totalReturnE6.toString(),
    maxDrawdownE6: r.maxDrawdownE6.toString(),
    timestamp: Number(r.timestamp),
    runUrl: `https://cruciblebench.xyz/runs/${ids[i].toString()}`,
  }));
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-server/src/tools/abort-run.ts packages/mcp-server/src/tools/get-my-runs.ts
git commit -m "feat(mcp-server): tools — abort_run + get_my_runs"
```

---

## Task 20: Streamable HTTP MCP transport (Fastify)

**Files:**
- Create: `packages/mcp-server/src/server.ts`
- Create: `packages/mcp-server/src/config.ts`
- Modify: `packages/mcp-server/src/index.ts`

Wires the 5 tools to an MCP server using `@modelcontextprotocol/sdk`'s Streamable HTTP transport, served by Fastify.

- [ ] **Step 1: Implement `config.ts`**

```ts
// packages/mcp-server/src/config.ts
import { ethers } from "ethers";
import { loadChainConfig, type Network, AgentINFTClient, RunRegistryV2Client } from "@crucible/og-client";
import { buildDomain, type EIP712Domain } from "./auth";

export interface ServerConfig {
  port: number;
  network: Network;
  scenariosDir: string;
  publicUrl: string;          // e.g. "https://mcp.cruciblebench.xyz"
  publisherPrivateKey: string;
  domain: EIP712Domain;
  inft: AgentINFTClient;
  runRegistry: RunRegistryV2Client;
  provider: ethers.JsonRpcProvider;
  publisher: ethers.Wallet;
}

export async function loadConfig(): Promise<ServerConfig> {
  const port = parseInt(process.env.PORT ?? "8080", 10);
  const network = (process.env.NETWORK ?? "galileo") as Network;
  const scenariosDir = process.env.SCENARIOS_DIR ?? "scenarios";
  const publicUrl = process.env.PUBLIC_URL ?? "http://localhost:8080";
  const pk = process.env.PUBLISHER_PRIVATE_KEY;
  if (!pk) throw new Error("Missing PUBLISHER_PRIVATE_KEY env");

  const cfg = await loadChainConfig(network);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const publisher = new ethers.Wallet(pk, provider);
  const inft = new AgentINFTClient(cfg, provider);
  const runRegistry = new RunRegistryV2Client(cfg, publisher);  // signer for publish
  const domain = buildDomain(cfg.chainId, cfg.contracts.RunRegistryV2);

  return { port, network, scenariosDir, publicUrl, publisherPrivateKey: pk, domain, inft, runRegistry, provider, publisher };
}
```

- [ ] **Step 2: Implement `server.ts`**

```ts
// packages/mcp-server/src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "./config";
import { SessionRegistry } from "./session";
import { listScenarios } from "./tools/list-scenarios";
import { handleStartRun, StartRunInput } from "./tools/start-run";
import { handleNextTick, NextTickInput } from "./tools/next-tick";
import { handleAbortRun, AbortRunInput } from "./tools/abort-run";
import { handleGetMyRuns } from "./tools/get-my-runs";

export interface McpServerCtx {
  cfg: ServerConfig;
  sessions: SessionRegistry;
}

export function buildMcpServer(ctx: McpServerCtx): Server {
  const server = new Server(
    { name: "crucible-bench", version: "2.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "crucible.list_scenarios", description: "List available scenarios", inputSchema: { type: "object", properties: {} } },
      { name: "crucible.start_run", description: "Start a new benchmark run; returns runId + tick 0 observation", inputSchema: { type: "object", properties: {
        scenarioId: { type: "string" }, tokenId: { type: "string" }, nonce: { type: "string" },
        signature: { type: "string" }, signer: { type: "string" },
      }, required: ["scenarioId","tokenId","nonce","signature","signer"] }},
      { name: "crucible.next_tick", description: "Submit signed action for current tick; receive next observation", inputSchema: { type: "object", properties: {
        runId: { type: "string" }, tickId: { type: "number" },
        kind: { type: "string", enum: ["market_buy","market_sell","noop"] },
        qty: { type: "string" }, reasoning: { type: "string" }, nonce: { type: "string" },
        signature: { type: "string" }, signer: { type: "string" },
      }, required: ["runId","tickId","kind","qty","nonce","signature","signer"] }},
      { name: "crucible.abort_run", description: "Cancel a run", inputSchema: { type: "object", properties: {
        runId: { type: "string" }, reason: { type: "string" }, nonce: { type: "string" },
        signature: { type: "string" }, signer: { type: "string" },
      }, required: ["runId","nonce","signature","signer"] }},
      { name: "crucible.get_my_runs", description: "List published runs for a tokenId", inputSchema: { type: "object", properties: {
        tokenId: { type: "string" },
      }, required: ["tokenId"] }},
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    switch (name) {
      case "crucible.list_scenarios":
        return { content: [{ type: "text", text: JSON.stringify(await listScenarios(ctx.cfg.scenariosDir)) }] };
      case "crucible.start_run":
        return { content: [{ type: "text", text: JSON.stringify(await handleStartRun({
          domain: ctx.cfg.domain, inft: ctx.cfg.inft, registry: ctx.sessions,
          scenariosDir: ctx.cfg.scenariosDir, input: StartRunInput.parse(args),
        })) }] };
      case "crucible.next_tick":
        return { content: [{ type: "text", text: JSON.stringify(await handleNextTick({
          domain: ctx.cfg.domain, inft: ctx.cfg.inft, registry: ctx.sessions,
          input: NextTickInput.parse(args),
        })) }] };
      case "crucible.abort_run":
        return { content: [{ type: "text", text: JSON.stringify(await handleAbortRun({
          domain: ctx.cfg.domain, registry: ctx.sessions, input: AbortRunInput.parse(args),
        })) }] };
      case "crucible.get_my_runs":
        return { content: [{ type: "text", text: JSON.stringify(await handleGetMyRuns({
          registry: ctx.cfg.runRegistry, tokenId: BigInt((args as any).tokenId),
        })) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
```

- [ ] **Step 3: Build the Fastify entry in `index.ts`**

```ts
// packages/mcp-server/src/index.ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config";
import { buildMcpServer } from "./server";
import { SessionRegistry } from "./session";
import { registerSpectator } from "./spectator";
import { registerPublishOnDone } from "./publish-on-done";

async function main() {
  const cfg = await loadConfig();
  const sessions = new SessionRegistry();
  const mcp = buildMcpServer({ cfg, sessions });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await mcp.connect(transport);

  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.all("/v1/*", async (req, reply) => transport.handleRequest(req.raw, reply.raw, req.body));
  app.get("/healthz", async () => ({ ok: true }));

  registerSpectator(app, sessions);
  registerPublishOnDone(sessions, cfg);

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  console.log(`MCP server up on :${cfg.port} (network=${cfg.network})`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Smoke build**

```bash
cd packages/mcp-server && pnpm typecheck
```

Expected: clean. (Spectator + publish-on-done modules added in next two tasks.)

- [ ] **Step 5: Commit (server scaffold complete; not yet runnable)**

```bash
git add packages/mcp-server/src/server.ts packages/mcp-server/src/config.ts packages/mcp-server/src/index.ts
git commit -m "feat(mcp-server): wire 5 MCP tools through Streamable HTTP + Fastify entry"
```

---

## Task 21: WebSocket spectator endpoint + fanout

**Files:**
- Create: `packages/mcp-server/src/spectator.ts`

Subscribers connect to `/spectate/:runId`. Server pushes session events as JSON frames; multiple subscribers per run supported (read-only fanout).

- [ ] **Step 1: Implement**

```ts
// packages/mcp-server/src/spectator.ts
import type { FastifyInstance } from "fastify";
import type { SessionRegistry } from "./session";

export function registerSpectator(app: FastifyInstance, sessions: SessionRegistry) {
  app.get("/spectate/:runId", { websocket: true }, (conn, req) => {
    const runId = (req.params as any).runId as string;
    let session;
    try { session = sessions.get(runId); }
    catch { conn.socket.send(JSON.stringify({ type: "error", reason: "UNKNOWN_RUN" })); conn.socket.close(); return; }

    const send = (type: string, payload: unknown) => {
      try { conn.socket.send(JSON.stringify({ type, payload, ts: Date.now() })); } catch {}
    };
    send("hello", { runId, tokenId: session.tokenId.toString(), scenarioId: session.scenarioId, status: session.status });

    const onTick = (ev: any) => send("tick", ev);
    const onDone = (ev: any) => send("done", ev);
    const onAbort = (ev: any) => send("abort", ev);
    session.events.on("tick", onTick);
    session.events.on("done", onDone);
    session.events.on("abort", onAbort);

    conn.socket.on("close", () => {
      session.events.off("tick", onTick);
      session.events.off("done", onDone);
      session.events.off("abort", onAbort);
    });
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/spectator.ts
git commit -m "feat(mcp-server): WebSocket spectator endpoint (read-only fanout per runId)"
```

---

## Task 22: Auto-publish on `done`

**Files:**
- Create: `packages/mcp-server/src/publish-on-done.ts`

Listens to session events; when a session emits `done`, writes the trace + scorecard to a temp dir, calls `publishRunV2`, emits a final `published` event with the on-chain runId + URL.

- [ ] **Step 1: Implement**

```ts
// packages/mcp-server/src/publish-on-done.ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ethers } from "ethers";
import { publishRunV2 } from "@crucible/og-client";
import type { SessionRegistry } from "./session";
import type { ServerConfig } from "./config";

export function registerPublishOnDone(sessions: SessionRegistry, cfg: ServerConfig) {
  // Hook into session creation by intercepting registry.create — simplest: poll active sessions
  // every 500ms for status === "completed" with unpublished traces. Or, more cleanly, re-emit
  // from the engine. We use the second pattern: tools/next-tick.ts emits "done" with traceJsonl
  // and scorecard already, so we listen at session-create time.
  const origCreate = sessions.create.bind(sessions);
  sessions.create = ((opts) => {
    const runId = origCreate(opts);
    const sess = sessions.get(runId);
    sess.events.on("done", async (ev: any) => {
      try {
        const dir = await mkdtemp(path.join(tmpdir(), `run-${runId}-`));
        await writeFile(path.join(dir, "trace.jsonl"), ev.traceJsonl ?? "");
        await writeFile(path.join(dir, "scorecard.json"), JSON.stringify(ev.scorecard));
        const result = await publishRunV2({
          runDir: dir, tokenId: sess.tokenId, scenarioId: ethers.id(sess.scenarioId),
          network: cfg.network, privateKey: cfg.publisherPrivateKey,
        });
        sess.events.emit("published", { runId: result.runId.toString(), txHash: result.txHash, url: `https://cruciblebench.xyz/runs/${result.runId}` });
        sessions.markCompleted(runId);
      } catch (err) {
        sess.events.emit("publish_failed", { error: String(err) });
      }
    });
    return runId;
  }) as any;
}
```

(Note: monkey-patching `registry.create` is acceptable here for simplicity. If preferred, refactor `SessionRegistry` to accept a "session created" callback in its constructor and pass the publish handler there.)

- [ ] **Step 2: Update `next-tick.ts` to include `traceJsonl` in the `done` event**

In `tools/next-tick.ts`, the `done` branch already passes `traceJsonl` to the response — also pass it in the `done` event:

```ts
session.events.emit("done", { scorecard, traceJsonl });
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add packages/mcp-server/src/publish-on-done.ts packages/mcp-server/src/tools/next-tick.ts
git commit -m "feat(mcp-server): auto-publish run on engine completion (uploads trace + RunRegistryV2.publish)"
```

---

## Task 23: Server runnable + smoke test (manual)

**Files:**
- Create: `packages/mcp-server/.env.example`
- Modify: `packages/mcp-server/README.md`

- [ ] **Step 1: `.env.example`**

```bash
PORT=8080
NETWORK=galileo
SCENARIOS_DIR=../../scenarios
PUBLIC_URL=http://localhost:8080
PUBLISHER_PRIVATE_KEY=0x...        # 0G wallet that publishes runs (must be RunRegistryV2 trustedAttester)
```

- [ ] **Step 2: README**

Document running locally:

```markdown
# @crucible/mcp-server

```bash
cp .env.example .env  # fill in PUBLISHER_PRIVATE_KEY
pnpm dev              # starts on :8080
curl http://localhost:8080/healthz
```

MCP endpoint: `http://localhost:8080/v1`.
Spectator WS: `ws://localhost:8080/spectate/<runId>`.
```

- [ ] **Step 3: Manual smoke (USER ACTION) — run server + hit it from a quick MCP client**

```bash
cd packages/mcp-server
cp .env.example .env  # fill in PUBLISHER_PRIVATE_KEY
pnpm dev
# in another terminal:
curl -X POST http://localhost:8080/v1 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: JSON-RPC response listing the 5 `crucible.*` tools.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-server/.env.example packages/mcp-server/README.md
git commit -m "docs(mcp-server): .env.example + local-dev README"
```

---

# Phase 4 — Reference Examples + Protocol Docs

## Task 24: Reference TS agent (~30 LOC)

**Files:**
- Create: `examples/reference-agent-ts/package.json`
- Create: `examples/reference-agent-ts/agent.ts`
- Create: `examples/reference-agent-ts/README.md`

A working, copy-paste agent that connects via MCP, signs each action with a wallet, runs to completion. Uses Anthropic for decisions.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "crucible-reference-agent-ts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "start": "tsx agent.ts" },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ethers": "^6.13.0"
  },
  "devDependencies": { "tsx": "^4.19.0", "typescript": "^5.5.0" }
}
```

- [ ] **Step 2: `agent.ts`**

```ts
// examples/reference-agent-ts/agent.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import Anthropic from "@anthropic-ai/sdk";

const SERVER_URL = process.env.CRUCIBLE_MCP_URL ?? "http://localhost:8080/v1";
const SCENARIO   = process.env.SCENARIO ?? "choppy-range";
const TOKEN_ID   = process.env.AGENT_TOKEN_ID ?? "1";
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;
const RUN_REGISTRY = process.env.RUN_REGISTRY_V2 ?? "0x0000000000000000000000000000000000000000";

const wallet = new ethers.Wallet(PRIVATE_KEY);
const anthropic = new Anthropic();

const domain = { name: "CrucibleBench", version: "2", chainId: 16602, verifyingContract: RUN_REGISTRY };

const ACTION_TYPES = { Action: [
  { name: "runId", type: "bytes32" }, { name: "tickId", type: "uint32" },
  { name: "kind", type: "string" },   { name: "qty", type: "uint256" },
  { name: "reasoning", type: "string" }, { name: "nonce", type: "uint256" },
]};

const START_RUN_TYPES = { StartRun: [
  { name: "scenarioId", type: "string" }, { name: "tokenId", type: "uint256" }, { name: "nonce", type: "uint256" },
]};

async function decide(observation: any): Promise<{ kind: string; qty: bigint; reasoning: string }> {
  const r = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    system: "Trader. Reply with raw JSON: {\"kind\":\"market_buy\"|\"market_sell\"|\"noop\",\"qty\":\"<wei>\",\"reasoning\":\"…\"}",
    messages: [{ role: "user", content: JSON.stringify(observation) }],
  });
  const txt = (r.content[0] as any).text as string;
  const json = JSON.parse(txt.replace(/^```(?:json)?|```$/g, "").trim());
  return { kind: json.kind, qty: BigInt(json.qty), reasoning: json.reasoning ?? "" };
}

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "reference-agent-ts", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);

  // start_run
  let nonce = 1n;
  const startSig = await wallet.signTypedData(domain, START_RUN_TYPES, {
    scenarioId: SCENARIO, tokenId: BigInt(TOKEN_ID), nonce,
  });
  const start = await client.callTool({ name: "crucible.start_run", arguments: {
    scenarioId: SCENARIO, tokenId: TOKEN_ID, nonce: nonce.toString(),
    signature: startSig, signer: wallet.address,
  }});
  let { runId, observation } = JSON.parse((start.content[0] as any).text);
  console.log("Run started:", runId);

  // tick loop
  while (true) {
    const action = await decide(observation);
    nonce += 1n;
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, {
      runId, tickId: observation.tickId, kind: action.kind, qty: action.qty,
      reasoning: action.reasoning, nonce,
    });
    const r = await client.callTool({ name: "crucible.next_tick", arguments: {
      runId, tickId: observation.tickId, kind: action.kind,
      qty: action.qty.toString(), reasoning: action.reasoning, nonce: nonce.toString(),
      signature: sig, signer: wallet.address,
    }});
    const out = JSON.parse((r.content[0] as any).text);
    if (out.done) { console.log("Done:", out.scorecard); return; }
    observation = out.observation;
    console.log(`tick ${observation.tickId}/${observation.tickId + observation.ticksRemaining - 1} → ${action.kind}`);
  }
}

main().catch(console.error);
```

- [ ] **Step 3: `README.md`**

```markdown
# Reference TS Agent for Crucible Bench

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export AGENT_PRIVATE_KEY=0x...     # wallet authorized for the INFT
export AGENT_TOKEN_ID=42
export CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1
export RUN_REGISTRY_V2=0x...       # from cruciblebench.xyz/api/contracts
export SCENARIO=choppy-range
pnpm install
pnpm start
```
```

- [ ] **Step 4: Commit**

```bash
git add examples/reference-agent-ts/
git commit -m "feat(examples): TS reference agent — MCP client + EIP-712 sig + Anthropic decide"
```

---

## Task 25: Reference Python agent

**Files:**
- Create: `examples/reference-agent-python/agent.py`
- Create: `examples/reference-agent-python/pyproject.toml`
- Create: `examples/reference-agent-python/README.md`

- [ ] **Step 1: `pyproject.toml`**

```toml
[project]
name = "crucible-reference-agent-python"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "anthropic>=0.30",
  "mcp>=1.0",
  "eth-account>=0.13",
  "httpx>=0.27",
]
```

- [ ] **Step 2: `agent.py`**

```python
import os, json, asyncio
from anthropic import Anthropic
from eth_account import Account
from eth_account.messages import encode_typed_data
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

SERVER_URL = os.environ.get("CRUCIBLE_MCP_URL", "http://localhost:8080/v1")
SCENARIO = os.environ.get("SCENARIO", "choppy-range")
TOKEN_ID = os.environ.get("AGENT_TOKEN_ID", "1")
PK = os.environ["AGENT_PRIVATE_KEY"]
RUN_REGISTRY = os.environ.get("RUN_REGISTRY_V2", "0x" + "00"*20)

acct = Account.from_key(PK)
anthropic = Anthropic()

DOMAIN = {"name": "CrucibleBench", "version": "2", "chainId": 16602, "verifyingContract": RUN_REGISTRY}

ACTION_TYPES = {"Action": [
    {"name": "runId", "type": "bytes32"}, {"name": "tickId", "type": "uint32"},
    {"name": "kind", "type": "string"},   {"name": "qty", "type": "uint256"},
    {"name": "reasoning", "type": "string"}, {"name": "nonce", "type": "uint256"},
]}
START_TYPES = {"StartRun": [
    {"name": "scenarioId", "type": "string"}, {"name": "tokenId", "type": "uint256"}, {"name": "nonce", "type": "uint256"},
]}

def sign(types, primary, payload):
    msg = encode_typed_data(domain_data=DOMAIN, message_types=types, message_data=payload)
    return acct.sign_message(msg).signature.hex()

def decide(obs):
    r = anthropic.messages.create(
        model="claude-haiku-4-5", max_tokens=256,
        system='Trader. Reply with JSON: {"kind":"market_buy|market_sell|noop","qty":"<wei>","reasoning":"…"}',
        messages=[{"role": "user", "content": json.dumps(obs)}],
    )
    txt = r.content[0].text.strip().strip("`").lstrip("json")
    j = json.loads(txt)
    return j["kind"], int(j["qty"]), j.get("reasoning", "")

async def main():
    async with streamablehttp_client(SERVER_URL) as (read, write, _):
        async with ClientSession(read, write) as sess:
            await sess.initialize()
            nonce = 1
            sig = sign(START_TYPES, "StartRun", {"scenarioId": SCENARIO, "tokenId": int(TOKEN_ID), "nonce": nonce})
            start = await sess.call_tool("crucible.start_run", {
                "scenarioId": SCENARIO, "tokenId": TOKEN_ID, "nonce": str(nonce),
                "signature": sig, "signer": acct.address,
            })
            data = json.loads(start.content[0].text)
            run_id = data["runId"]; obs = data["observation"]
            while True:
                kind, qty, reasoning = decide(obs)
                nonce += 1
                sig = sign(ACTION_TYPES, "Action", {
                    "runId": run_id, "tickId": obs["tickId"], "kind": kind, "qty": qty,
                    "reasoning": reasoning, "nonce": nonce,
                })
                r = await sess.call_tool("crucible.next_tick", {
                    "runId": run_id, "tickId": obs["tickId"], "kind": kind, "qty": str(qty),
                    "reasoning": reasoning, "nonce": str(nonce), "signature": sig, "signer": acct.address,
                })
                out = json.loads(r.content[0].text)
                if out.get("done"):
                    print("Done:", out["scorecard"]); return
                obs = out["observation"]
                print(f"tick {obs['tickId']}: {kind}")

asyncio.run(main())
```

- [ ] **Step 3: `README.md`**

```markdown
# Reference Python Agent for Crucible Bench

```bash
pip install -e .
export ANTHROPIC_API_KEY=...
export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=42
python agent.py
```
```

- [ ] **Step 4: Commit**

```bash
git add examples/reference-agent-python/
git commit -m "feat(examples): Python reference agent — same flow as TS reference"
```

---

## Task 26: Protocol spec doc

**Files:**
- Create: `docs/protocol/v2.md`

A standalone, no-context-required reference for anyone integrating an agent.

- [ ] **Step 1: Write protocol doc**

```markdown
# Crucible Bench Protocol v2

Hosted MCP server: `https://mcp.cruciblebench.xyz/v1`
Transport: MCP Streamable HTTP.
Authentication: EIP-712 signatures bound to an ERC-7857 INFT (`AgentINFT`) on 0G Galileo (chain ID 16602).

## Tools

### `crucible.list_scenarios()`
Returns: `Array<{ id, name, difficulty, kind, totalTicks, asset, description }>`

### `crucible.start_run({ scenarioId, tokenId, nonce, signature, signer })`
Signature: EIP-712 over `StartRun { scenarioId, tokenId, nonce }`.
Returns: `{ runId, ticksRemaining, observation, spectatorUrl }`.
Errors: `BAD_SIGNATURE`, `UNAUTHORIZED` (signer is not authorized for tokenId), `WALLET_NOT_REGISTERED`.

### `crucible.next_tick({ runId, tickId, kind, qty, reasoning, nonce, signature, signer })`
Signature: EIP-712 over `Action { runId, tickId, kind, qty, reasoning, nonce }`.
`nonce` MUST be exactly previous nonce + 1.
Returns: `{ tickId, fill, observation, ticksRemaining, done, scorecard?, runUrl? }`.
Errors: `BAD_SIGNATURE`, `BAD_NONCE`, `UNAUTHORIZED_SIGNER`.

### `crucible.abort_run({ runId, reason, nonce, signature, signer })`
Signature: EIP-712 over `AbortRun { runId, reason, nonce }`.
Returns: `{ aborted: true }`.

### `crucible.get_my_runs({ tokenId })`
Returns: array of published runs for that INFT.

## EIP-712 Domain

```
{ name: "CrucibleBench", version: "2", chainId: 16602, verifyingContract: <RunRegistryV2 address> }
```

## EIP-712 Types

```
Action(bytes32 runId, uint32 tickId, string kind, uint256 qty, string reasoning, uint256 nonce)
StartRun(string scenarioId, uint256 tokenId, uint256 nonce)
AbortRun(bytes32 runId, string reason, uint256 nonce)
```

## Identity

Every wallet that signs MUST be authorized for the INFT. Authorization = (wallet is the INFT owner) OR (wallet is in `AgentINFT.getDelegations(tokenId)`).

To register: visit `https://cruciblebench.xyz/register`, connect wallet, mint INFT, optionally delegate a hot wallet.

## Trace verification

Every tick recorded in `trace.jsonl` carries its signature. Auditors:
1. Read RunRegistryV2.getRun(runId) → `{ tokenId, traceRoot, scorecardHash, ... }`
2. Pull trace from 0G Storage via `traceRoot`
3. For each line: recover EIP-712 signer, check `AgentINFT.isAuthorized(tokenId, signer)`
4. Hash trace bytes, must equal `traceRoot`

## Reference implementations

- TypeScript: [`examples/reference-agent-ts/`](../../examples/reference-agent-ts/)
- Python: [`examples/reference-agent-python/`](../../examples/reference-agent-python/)

## Per-tick deadline

30 seconds. If `next_tick` doesn't arrive within 30s of the previous response, server records `timeout` action and continues. 5 consecutive timeouts → run auto-aborted.
```

- [ ] **Step 2: Commit**

```bash
git add docs/protocol/v2.md
git commit -m "docs(protocol): Crucible Bench v2 protocol spec — MCP tools + EIP-712 types"
```

---

# Phase 5 — Web Platform Additions

## Task 27: wagmi + RainbowKit + 0G chain config

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/lib/wagmi.ts`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Add dependencies**

```bash
cd apps/web && pnpm add wagmi @rainbow-me/rainbowkit viem @tanstack/react-query
```

- [ ] **Step 2: `lib/wagmi.ts`**

```ts
// apps/web/lib/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const galileo = defineChain({
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: { default: { name: "Chainscan", url: "https://chainscan-galileo.0g.ai" } },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "Crucible Bench",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "REPLACE_ME",
  chains: [galileo],
  ssr: true,
});
```

- [ ] **Step 3: Wrap `app/layout.tsx` with providers**

Edit `apps/web/app/layout.tsx`:

```tsx
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={lightTheme()}>{children}</RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

(If `app/layout.tsx` already has Header markup etc., wrap the existing body content with the providers — don't strip the existing markup.)

- [ ] **Step 4: Add `WalletConnectButton` to header nav**

Create `apps/web/components/WalletConnectButton.tsx`:

```tsx
"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
export function WalletConnectButton() {
  return <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />;
}
```

Insert it into the header in `app/layout.tsx` next to the existing nav items.

- [ ] **Step 5: Smoke**

```bash
pnpm dev
```

Browser: visit `localhost:3001`, click "Connect Wallet" — should open the RainbowKit modal showing 0G Galileo.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/lib/wagmi.ts apps/web/app/layout.tsx apps/web/components/WalletConnectButton.tsx pnpm-lock.yaml
git commit -m "feat(web): wagmi + RainbowKit + 0G Galileo chain — connect button in header"
```

---

## Task 28: `/login` bounce page

**Files:**
- Create: `apps/web/app/login/page.tsx`

Simple bounce page: connect wallet, then redirects to `/my-agents`.

- [ ] **Step 1: Implement**

```tsx
// apps/web/app/login/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  useEffect(() => { if (isConnected) router.push("/my-agents"); }, [isConnected, router]);
  return (
    <main className="max-w-xl mx-auto py-24 text-center">
      <h1 className="text-3xl font-semibold mb-4">Sign in to Crucible Bench</h1>
      <p className="text-zinc-600 mb-8">Connect a 0G Galileo wallet to manage your agents.</p>
      <ConnectButton />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "feat(web): /login bounce page (wallet-connect → /my-agents)"
```

---

## Task 29: `lib/contracts.ts` read helpers

**Files:**
- Create: `apps/web/lib/contracts.ts`

Browser-side wagmi/viem reads against AgentINFT and RunRegistryV2.

- [ ] **Step 1: Implement**

```ts
// apps/web/lib/contracts.ts
import { createPublicClient, http } from "viem";
import { galileo } from "./wagmi";
import deployedAddresses from "../../../contracts/deployed-addresses.json" assert { type: "json" };

const v2 = (deployedAddresses as any).galileoV2 ?? {};
export const AGENT_INFT_ADDRESS: `0x${string}` = v2.AgentINFT;
export const RUN_REGISTRY_V2_ADDRESS: `0x${string}` = v2.RunRegistryV2;

const AGENT_INFT_ABI = [
  { type:"function", name:"tokensOf", stateMutability:"view", inputs:[{name:"o",type:"address"}], outputs:[{type:"uint256[]"}] },
  { type:"function", name:"intelligentData", stateMutability:"view", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"string"},{type:"bytes32"}] },
  { type:"function", name:"ownerOf", stateMutability:"view", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"address"}] },
  { type:"function", name:"getDelegations", stateMutability:"view", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"address[]"}] },
  { type:"function", name:"isAuthorized", stateMutability:"view", inputs:[{name:"id",type:"uint256"},{name:"s",type:"address"}], outputs:[{type:"bool"}] },
  { type:"function", name:"mint", stateMutability:"nonpayable", inputs:[{name:"d",type:"string"},{name:"h",type:"bytes32"}], outputs:[{type:"uint256"}] },
  { type:"function", name:"delegateAccess", stateMutability:"nonpayable", inputs:[{name:"id",type:"uint256"},{name:"a",type:"address"}], outputs:[] },
  { type:"function", name:"revokeAccess", stateMutability:"nonpayable", inputs:[{name:"id",type:"uint256"},{name:"a",type:"address"}], outputs:[] },
] as const;

const RUN_REGISTRY_V2_ABI = [
  { type:"function", name:"getRunsByToken", stateMutability:"view", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"uint256[]"}] },
  { type:"function", name:"getRunsByScenario", stateMutability:"view", inputs:[{name:"id",type:"bytes32"}], outputs:[{type:"uint256[]"}] },
  { type:"function", name:"totalRuns", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { type:"function", name:"getRun", stateMutability:"view", inputs:[{name:"id",type:"uint256"}], outputs:[
    { type: "tuple", components: [
      { name:"tokenId", type:"uint256" }, { name:"scenarioId", type:"bytes32" },
      { name:"traceRoot", type:"bytes32" }, { name:"scorecardHash", type:"bytes32" },
      { name:"scoreSortinoE6", type:"int256" }, { name:"totalReturnE6", type:"int256" },
      { name:"maxDrawdownE6", type:"int256" }, { name:"timestamp", type:"uint64" },
      { name:"recordedBy", type:"address" },
    ]},
  ]},
] as const;

export const publicClient = createPublicClient({ chain: galileo, transport: http() });

export async function readTokensOf(owner: `0x${string}`): Promise<bigint[]> {
  return await publicClient.readContract({ address: AGENT_INFT_ADDRESS, abi: AGENT_INFT_ABI, functionName: "tokensOf", args: [owner] }) as bigint[];
}

export async function readIntelligentData(tokenId: bigint) {
  const r = await publicClient.readContract({ address: AGENT_INFT_ADDRESS, abi: AGENT_INFT_ABI, functionName: "intelligentData", args: [tokenId] }) as readonly [string, `0x${string}`];
  return { description: r[0], dataHash: r[1] };
}

export async function readDelegations(tokenId: bigint): Promise<readonly `0x${string}`[]> {
  return await publicClient.readContract({ address: AGENT_INFT_ADDRESS, abi: AGENT_INFT_ABI, functionName: "getDelegations", args: [tokenId] }) as `0x${string}`[];
}

export async function readRunsByToken(tokenId: bigint): Promise<bigint[]> {
  return await publicClient.readContract({ address: RUN_REGISTRY_V2_ADDRESS, abi: RUN_REGISTRY_V2_ABI, functionName: "getRunsByToken", args: [tokenId] }) as bigint[];
}

export async function readRun(runId: bigint) {
  return await publicClient.readContract({ address: RUN_REGISTRY_V2_ADDRESS, abi: RUN_REGISTRY_V2_ABI, functionName: "getRun", args: [runId] }) as any;
}

export const ABIs = { AGENT_INFT_ABI, RUN_REGISTRY_V2_ABI };
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/contracts.ts
git commit -m "feat(web): contracts.ts read helpers for AgentINFT + RunRegistryV2"
```

---

## Task 30: `/my-agents` page + `InftMintForm`

**Files:**
- Create: `apps/web/app/my-agents/page.tsx`
- Create: `apps/web/app/my-agents/MyAgentsClient.tsx`
- Create: `apps/web/components/InftMintForm.tsx`

Lists user's INFTs with description, runs count, link to detail. Mint form at top.

- [ ] **Step 1: `app/my-agents/page.tsx`** (server shell)

```tsx
import { MyAgentsClient } from "./MyAgentsClient";
export default function MyAgentsPage() {
  return <MyAgentsClient />;
}
```

- [ ] **Step 2: `MyAgentsClient.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from "swr";
import { readTokensOf, readIntelligentData, readRunsByToken } from "@/lib/contracts";
import { InftMintForm } from "@/components/InftMintForm";

async function loadAgents(owner: `0x${string}`) {
  const tokenIds = await readTokensOf(owner);
  return Promise.all(tokenIds.map(async (id) => {
    const [data, runs] = await Promise.all([readIntelligentData(id), readRunsByToken(id)]);
    return { id, description: data.description, dataHash: data.dataHash, runs: runs.length };
  }));
}

export function MyAgentsClient() {
  const { address, isConnected } = useAccount();
  const { data: agents, mutate } = useSWR(isConnected && address ? ["agents", address] : null, () => loadAgents(address!));

  if (!isConnected) return <main className="p-12 text-center">Connect your wallet to manage agents.</main>;

  return (
    <main className="max-w-3xl mx-auto py-12 space-y-12">
      <section>
        <h1 className="text-3xl font-semibold mb-2">Your Agents</h1>
        <p className="text-zinc-600">Each agent is an ERC-7857 INFT on 0G Galileo.</p>
      </section>
      <InftMintForm onMinted={() => mutate()} />
      <section className="space-y-3">
        {agents?.length === 0 && <p className="text-zinc-500">No agents yet. Mint one above.</p>}
        {agents?.map((a) => (
          <Link key={a.id.toString()} href={`/agents/${a.id}`} className="block p-4 border rounded hover:bg-zinc-50">
            <div className="font-medium">#{a.id.toString()} — {a.description || "Unnamed agent"}</div>
            <div className="text-sm text-zinc-500 mt-1">{a.runs} run{a.runs === 1 ? "" : "s"}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: `InftMintForm.tsx`**

```tsx
// apps/web/components/InftMintForm.tsx
"use client";
import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import { AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";

export function InftMintForm({ onMinted }: { onMinted?: () => void }) {
  const [desc, setDesc] = useState("");
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    const dataHash = keccak256(stringToBytes(desc));   // commitment to the description for v1
    await writeContractAsync({
      address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "mint", args: [desc, dataHash],
    });
    setDesc("");
    onMinted?.();
  }

  return (
    <form onSubmit={submit} className="p-4 border rounded space-y-3">
      <h2 className="font-semibold">Mint New Agent INFT</h2>
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Description (e.g. Momentum trader v3)"
        value={desc} onChange={(e) => setDesc(e.target.value)} required
      />
      <button className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" disabled={isPending}>
        {isPending ? "Minting…" : "Mint INFT"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/my-agents/ apps/web/components/InftMintForm.tsx
git commit -m "feat(web): /my-agents — list owned INFTs + mint form"
```

---

## Task 31: `DelegationManager` component

**Files:**
- Create: `apps/web/components/DelegationManager.tsx`

Per-INFT card showing current delegated assistants with Add/Revoke. Used inside `/agents/[tokenId]`.

- [ ] **Step 1: Implement**

```tsx
// apps/web/components/DelegationManager.tsx
"use client";
import { useState } from "react";
import useSWR from "swr";
import { useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { AGENT_INFT_ADDRESS, ABIs, readDelegations } from "@/lib/contracts";

export function DelegationManager({ tokenId }: { tokenId: bigint }) {
  const { data: delegations, mutate } = useSWR(["delegations", tokenId.toString()], () => readDelegations(tokenId));
  const [newAddr, setNewAddr] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(newAddr)) return;
    await writeContractAsync({ address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "delegateAccess", args: [tokenId, newAddr as `0x${string}`] });
    setNewAddr(""); mutate();
  }

  async function revoke(addr: string) {
    await writeContractAsync({ address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
      functionName: "revokeAccess", args: [tokenId, addr as `0x${string}`] });
    mutate();
  }

  return (
    <div className="p-4 border rounded space-y-3">
      <h3 className="font-semibold">Delegated Signing Keys</h3>
      <p className="text-sm text-zinc-600">
        Authorize a hot wallet to sign actions on behalf of this INFT.
        The owner wallet always remains authorized.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2 font-mono text-sm" placeholder="0x…"
          value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" disabled={isPending}>Add</button>
      </form>
      <ul className="space-y-1">
        {delegations?.map((addr) => (
          <li key={addr} className="flex items-center justify-between font-mono text-sm">
            <span>{addr}</span>
            <button className="text-red-600" onClick={() => revoke(addr)}>Revoke</button>
          </li>
        ))}
        {delegations?.length === 0 && <li className="text-zinc-500 text-sm">No delegations.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/DelegationManager.tsx
git commit -m "feat(web): DelegationManager — add/revoke INFT delegations"
```

---

## Task 32: `/agents/[tokenId]` detail page

**Files:**
- Create: `apps/web/app/agents/[tokenId]/page.tsx`
- Create: `apps/web/app/agents/[tokenId]/AgentDetailClient.tsx`

Shows description, owner address, delegated keys (manager), runs history (links to `/runs/<id>`), big "Start Run" button → `/agents/[tokenId]/start`.

- [ ] **Step 1: Implement**

```tsx
// apps/web/app/agents/[tokenId]/page.tsx
import { AgentDetailClient } from "./AgentDetailClient";

export default function Page({ params }: { params: { tokenId: string } }) {
  return <AgentDetailClient tokenId={BigInt(params.tokenId)} />;
}
```

```tsx
// apps/web/app/agents/[tokenId]/AgentDetailClient.tsx
"use client";
import Link from "next/link";
import useSWR from "swr";
import { readIntelligentData, readRunsByToken, readRun } from "@/lib/contracts";
import { publicClient, AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";
import { DelegationManager } from "@/components/DelegationManager";

async function loadDetail(tokenId: bigint) {
  const [data, owner, runIds] = await Promise.all([
    readIntelligentData(tokenId),
    publicClient.readContract({ address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI, functionName: "ownerOf", args: [tokenId] }),
    readRunsByToken(tokenId),
  ]);
  const runs = await Promise.all(runIds.map(async (id) => ({ id, run: await readRun(id) })));
  return { description: data.description, owner: owner as string, runs };
}

export function AgentDetailClient({ tokenId }: { tokenId: bigint }) {
  const { data } = useSWR(["agent", tokenId.toString()], () => loadDetail(tokenId));
  if (!data) return <main className="p-12">Loading…</main>;
  return (
    <main className="max-w-3xl mx-auto py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Agent #{tokenId.toString()}</h1>
        <p className="text-zinc-700 mt-1">{data.description || "No description"}</p>
        <p className="text-xs font-mono text-zinc-500 mt-2">Owner: {data.owner}</p>
      </header>
      <Link href={`/agents/${tokenId}/start`} className="inline-block px-6 py-3 bg-black text-white rounded">Start a Benchmark Run</Link>
      <DelegationManager tokenId={tokenId} />
      <section>
        <h2 className="font-semibold mb-3">Run History</h2>
        {data.runs.length === 0 && <p className="text-zinc-500">No published runs yet.</p>}
        <ul className="space-y-2">
          {data.runs.map(({ id, run }) => (
            <li key={id.toString()}>
              <Link className="block p-3 border rounded hover:bg-zinc-50" href={`/runs/${id.toString()}`}>
                Run #{id.toString()} · Sortino {(Number(run.scoreSortinoE6) / 1e6).toFixed(3)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/agents/
git commit -m "feat(web): /agents/[tokenId] detail — runs history + delegation manager + start CTA"
```

---

## Task 33: `/agents/[tokenId]/start` page

**Files:**
- Create: `apps/web/app/agents/[tokenId]/start/page.tsx`
- Create: `apps/web/app/agents/[tokenId]/start/RunStarterClient.tsx`

Pick a scenario, click Start, get the connection card with the MCP server URL, runId, tokenId. (The actual `start_run` call is made by the user's agent — we just provision a session intent the server expects.)

For v1 simplicity, "Start Run" doesn't pre-allocate a runId on the server (the server creates one on the first MCP `start_run`). The page just shows the MCP URL, scenarioId, tokenId, and the connection guide.

- [ ] **Step 1: Implement**

```tsx
// apps/web/app/agents/[tokenId]/start/page.tsx
import { RunStarterClient } from "./RunStarterClient";
export default function Page({ params }: { params: { tokenId: string } }) {
  return <RunStarterClient tokenId={params.tokenId} />;
}
```

```tsx
// apps/web/app/agents/[tokenId]/start/RunStarterClient.tsx
"use client";
import { useState } from "react";
import useSWR from "swr";
import { ConnectionGuideTabs } from "@/components/ConnectionGuideTabs";

export function RunStarterClient({ tokenId }: { tokenId: string }) {
  const { data: scenarios } = useSWR("/api/scenarios", (u) => fetch(u).then((r) => r.json()));
  const [scenarioId, setScenarioId] = useState<string>("");
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="max-w-2xl mx-auto py-12 space-y-6">
        <h1 className="text-3xl font-semibold">Start a Benchmark Run — Agent #{tokenId}</h1>
        <select className="border rounded px-3 py-2 w-full" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
          <option value="">Select scenario…</option>
          {scenarios?.map((s: any) => <option key={s.id} value={s.id}>{s.name} (★{s.difficulty})</option>)}
        </select>
        <button onClick={() => setStarted(true)} disabled={!scenarioId}
          className="px-6 py-3 bg-black text-white rounded disabled:opacity-50">Continue</button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-semibold">Connect Your Agent</h1>
      <div className="p-4 border rounded space-y-2 font-mono text-sm">
        <div>MCP server URL: <span className="bg-zinc-100 px-2 py-1 rounded">{process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1"}</span></div>
        <div>Scenario: <span className="bg-zinc-100 px-2 py-1 rounded">{scenarioId}</span></div>
        <div>Token ID: <span className="bg-zinc-100 px-2 py-1 rounded">{tokenId}</span></div>
      </div>
      <ConnectionGuideTabs tokenId={tokenId} scenarioId={scenarioId} />
      <p className="text-zinc-600">Once your agent connects and starts trading, the spectator dashboard will go live (link will appear here).</p>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/agents/
git commit -m "feat(web): /agents/[tokenId]/start — pick scenario + connection card"
```

---

## Task 34: `ConnectionGuideTabs` component

**Files:**
- Create: `apps/web/components/ConnectionGuideTabs.tsx`

Tabs: TS, Python, OpenClaw, Cursor — each shows the env vars + run command needed.

- [ ] **Step 1: Implement**

```tsx
// apps/web/components/ConnectionGuideTabs.tsx
"use client";
import { useState } from "react";
import { CopyableCommand } from "@crucible/ui-kit";

export function ConnectionGuideTabs({ tokenId, scenarioId }: { tokenId: string; scenarioId: string }) {
  const [tab, setTab] = useState<"ts" | "python" | "openclaw" | "cursor">("ts");
  const env = `export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=${tokenId}
export SCENARIO=${scenarioId}
export CRUCIBLE_MCP_URL=${process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1"}
export RUN_REGISTRY_V2=...    # see /api/contracts
export ANTHROPIC_API_KEY=sk-ant-...`;

  return (
    <div className="border rounded">
      <div className="flex border-b">
        {(["ts", "python", "openclaw", "cursor"] as const).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm ${tab === t ? "bg-zinc-100 font-medium" : ""}`} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {tab === "ts" && <>
          <CopyableCommand command={env} />
          <CopyableCommand command={`git clone https://github.com/RomarioKavin1/Crucible.git
cd Crucible/examples/reference-agent-ts && pnpm install && pnpm start`} />
        </>}
        {tab === "python" && <>
          <CopyableCommand command={env} />
          <CopyableCommand command={`cd Crucible/examples/reference-agent-python && pip install -e . && python agent.py`} />
        </>}
        {tab === "openclaw" && <pre className="bg-zinc-900 text-zinc-100 p-4 rounded text-xs">{`# add to ~/.openclaw/openclaw.json
{
  "mcpServers": {
    "crucible": { "url": "${process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1"}" }
  }
}
# then in your OpenClaw chat:
# "Use crucible to start_run for scenario ${scenarioId} on tokenId ${tokenId}"`}</pre>}
        {tab === "cursor" && <pre className="bg-zinc-900 text-zinc-100 p-4 rounded text-xs">{`# .cursor/mcp.json
{ "mcpServers": { "crucible": { "url": "${process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1"}" } } }`}</pre>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/ConnectionGuideTabs.tsx
git commit -m "feat(web): ConnectionGuideTabs — TS / Python / OpenClaw / Cursor snippets"
```

---

## Task 35: `/runs/live/[runId]` live spectator

**Files:**
- Create: `apps/web/app/runs/live/[runId]/page.tsx`
- Create: `apps/web/app/runs/live/[runId]/LiveRunClient.tsx`
- Create: `apps/web/components/LiveRunReplay.tsx`

WebSocket client to `wss://mcp.cruciblebench.xyz/spectate/<runId>`. Renders existing components driven by live frames.

- [ ] **Step 1: Page shell**

```tsx
// apps/web/app/runs/live/[runId]/page.tsx
import { LiveRunClient } from "./LiveRunClient";
export default function Page({ params }: { params: { runId: string } }) {
  return <LiveRunClient runId={params.runId} />;
}
```

- [ ] **Step 2: Client + WS handling**

```tsx
// apps/web/app/runs/live/[runId]/LiveRunClient.tsx
"use client";
import { useEffect, useState } from "react";
import { LiveRunReplay } from "@/components/LiveRunReplay";

export function LiveRunClient({ runId }: { runId: string }) {
  const [status, setStatus] = useState("connecting");
  const [frames, setFrames] = useState<any[]>([]);
  const [published, setPublished] = useState<any | null>(null);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_MCP_URL ?? "wss://mcp.cruciblebench.xyz/v1")
      .replace(/^http/, "ws").replace(/\/v1\/?$/, "") + `/spectate/${runId}`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (msg) => {
      const f = JSON.parse(msg.data);
      setFrames((prev) => [...prev, f]);
      if (f.type === "published") setPublished(f.payload);
    };
    return () => ws.close();
  }, [runId]);

  return (
    <main className="max-w-5xl mx-auto py-8">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Live Run · {runId.slice(0, 10)}…</h1>
        <span className="text-sm text-zinc-500">{status}</span>
      </header>
      {published && <div className="p-4 mb-4 border rounded bg-green-50">
        Published as <a href={published.url} className="font-medium underline">Run #{published.runId}</a>
      </div>}
      <LiveRunReplay frames={frames} />
    </main>
  );
}
```

- [ ] **Step 3: `LiveRunReplay` component**

```tsx
// apps/web/components/LiveRunReplay.tsx
"use client";
import { ScenarioReplay, AgentReasoningStream, EquityCurve } from "@crucible/ui-kit";

export function LiveRunReplay({ frames }: { frames: any[] }) {
  // Project frames into the shapes existing components expect.
  const ticks = frames.filter((f) => f.type === "tick").map((f) => ({
    tickId: f.payload.tickId,
    price: f.payload.action?.observation?.price ?? 0,
    action: f.payload.action,
    reasoning: f.payload.action?.reasoning ?? "",
  }));
  const equity = ticks.map((t, i) => ({ tickId: t.tickId, value: 10000 + i * 1 })); // placeholder until server emits explicit equity in tick frames

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <ScenarioReplay ticks={ticks as any} />
        <EquityCurve points={equity as any} />
      </div>
      <AgentReasoningStream entries={ticks.map((t) => ({ tickId: t.tickId, text: t.reasoning, action: t.action })) as any} />
    </div>
  );
}
```

(If the existing `ScenarioReplay` / `EquityCurve` props differ from what's used here, the engineer adjusts to match the actual component prop shapes — `grep "interface.*Props" packages/ui-kit/src` to confirm.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/runs/live/ apps/web/components/LiveRunReplay.tsx
git commit -m "feat(web): /runs/live/[runId] — live WS spectator dashboard"
```

---

## Task 36: `/verify/[runId]` in-browser audit

**Files:**
- Create: `apps/web/app/verify/[runId]/page.tsx`
- Create: `apps/web/app/verify/[runId]/VerifierClient.tsx`

Pulls run from chain, downloads trace from 0G Storage, verifies signatures + INFT auth + traceRoot match.

- [ ] **Step 1: Page shell**

```tsx
// apps/web/app/verify/[runId]/page.tsx
import { VerifierClient } from "./VerifierClient";
export default function Page({ params }: { params: { runId: string } }) {
  return <VerifierClient runId={params.runId} />;
}
```

- [ ] **Step 2: Verifier (audit logic)**

```tsx
// apps/web/app/verify/[runId]/VerifierClient.tsx
"use client";
import { useState } from "react";
import { keccak256, recoverTypedDataAddress, hexToBytes, bytesToHex } from "viem";
import { sha256 } from "viem";
import { publicClient, AGENT_INFT_ADDRESS, ABIs, readRun } from "@/lib/contracts";

const STORAGE_GATEWAY = "https://indexer-storage-testnet-turbo.0g.ai/file?root=";
const DOMAIN = (rrAddr: string) => ({ name: "CrucibleBench", version: "2", chainId: 16602, verifyingContract: rrAddr });
const ACTION_TYPES = { Action: [
  { name: "runId", type: "bytes32" }, { name: "tickId", type: "uint32" },
  { name: "kind", type: "string" }, { name: "qty", type: "uint256" },
  { name: "reasoning", type: "string" }, { name: "nonce", type: "uint256" },
]};

export function VerifierClient({ runId }: { runId: string }) {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState<any | null>(null);

  async function audit() {
    setStatus("running");
    try {
      const run = await readRun(BigInt(runId));
      const traceText = await fetch(STORAGE_GATEWAY + run.traceRoot).then((r) => r.text());
      const lines = traceText.trim().split("\n");
      const traceHash = bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(traceText)).then((b) => new Uint8Array(b)));
      const rootMatches = traceHash.toLowerCase() === run.traceRoot.toLowerCase();

      let allSigsOk = true;
      for (const ln of lines) {
        const e = JSON.parse(ln);
        if (!e.signature || !e.signer) continue;  // legacy lines
        const recovered = await recoverTypedDataAddress({
          domain: DOMAIN(await publicClient.readContract({ address: AGENT_INFT_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI as any, functionName: "agentINFT" }) as string),
          types: ACTION_TYPES, primaryType: "Action",
          message: { runId: e.action.runId, tickId: e.action.tickId, kind: e.action.kind,
                     qty: BigInt(e.action.qty), reasoning: e.action.reasoning, nonce: BigInt(e.action.nonce) },
          signature: e.signature as `0x${string}`,
        });
        if (recovered.toLowerCase() !== e.signer.toLowerCase()) { allSigsOk = false; break; }
        const ok = await publicClient.readContract({
          address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
          functionName: "isAuthorized", args: [run.tokenId, e.signer],
        });
        if (!ok) { allSigsOk = false; break; }
      }
      setResult({ rootMatches, allSigsOk, traceLines: lines.length });
      setStatus("done");
    } catch (e) {
      setStatus("error"); setResult({ error: String(e) });
    }
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Verify Run #{runId}</h1>
      <button onClick={audit} className="px-6 py-3 bg-black text-white rounded">Run audit</button>
      {status === "running" && <p>Auditing…</p>}
      {result && <pre className="p-4 bg-zinc-100 rounded text-sm">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/verify/
git commit -m "feat(web): /verify/[runId] — in-browser trace + signature + INFT-auth audit"
```

---

## Task 37: `/register` standalone page

**Files:**
- Create: `apps/web/app/register/page.tsx`

Bouncer for users hitting the MCP `WALLET_NOT_REGISTERED` error. Connects wallet, mints INFT, redirects to `/my-agents`.

- [ ] **Step 1: Implement**

```tsx
// apps/web/app/register/page.tsx
"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { InftMintForm } from "@/components/InftMintForm";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  return (
    <main className="max-w-xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Register Your Agent</h1>
      {!isConnected
        ? <><p>First, connect a 0G Galileo wallet.</p><ConnectButton /></>
        : <><p>Mint your ERC-7857 Agent INFT below.</p>
            <InftMintForm onMinted={() => router.push("/my-agents")} /></>}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/register/
git commit -m "feat(web): /register — standalone wallet-connect → INFT mint flow"
```

---

## Task 38: Update `/leaderboard` for v2 + legacy v1 toggle

**Files:**
- Modify: `apps/web/app/leaderboard/page.tsx`
- Modify (or create): `apps/web/lib/leaderboard.ts`

The current leaderboard reads v1 RunRegistry. Add a toggle: "v2 (signed)" default, "v1 (legacy)" available.

- [ ] **Step 1: Add v2 fetch helper**

```ts
// apps/web/lib/leaderboard.ts
import { publicClient, RUN_REGISTRY_V2_ADDRESS, ABIs } from "./contracts";

export async function loadV2Leaderboard() {
  const total = await publicClient.readContract({
    address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI, functionName: "totalRuns",
  }) as bigint;
  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));
  return Promise.all(ids.map(async (id) => {
    const r = await publicClient.readContract({
      address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI, functionName: "getRun", args: [id],
    }) as any;
    return { runId: id, ...r };
  }));
}
```

- [ ] **Step 2: Update `/leaderboard/page.tsx`** — add a tab/toggle to switch between v1 and v2 sources, default to v2. Reuse existing leaderboard table component, pass either dataset.

(Implementation detail: copy existing v1 fetcher, extract into `loadV1Leaderboard()`, then page renders one or the other based on a `?source=v1|v2` query param defaulting to `v2`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/leaderboard.ts apps/web/app/leaderboard/page.tsx
git commit -m "feat(web): /leaderboard reads RunRegistryV2 by default; ?source=v1 for legacy"
```

---

## Task 39: Update scenario-detail Leaderboard tab for v2

**Files:**
- Modify: `apps/web/app/scenarios/[id]/LeaderboardTab.tsx` (or wherever the tab lives)

Same pattern — switch the data source for the per-scenario leaderboard to RunRegistryV2's `getRunsByScenario`. Resolve `agentId` → INFT description via `intelligentData(tokenId)`.

- [ ] **Step 1: Replace fetch with v2 helper**

```ts
// excerpt
import { keccak256, stringToBytes } from "viem";
import { publicClient, RUN_REGISTRY_V2_ADDRESS, AGENT_INFT_ADDRESS, ABIs } from "@/lib/contracts";

const scenarioHash = keccak256(stringToBytes(scenarioId));
const runIds = await publicClient.readContract({
  address: RUN_REGISTRY_V2_ADDRESS, abi: ABIs.RUN_REGISTRY_V2_ABI,
  functionName: "getRunsByScenario", args: [scenarioHash],
}) as bigint[];
// then getRun for each + intelligentData for each tokenId
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/scenarios/
git commit -m "feat(web): scenario-detail Leaderboard tab reads RunRegistryV2"
```

---

# Phase 6 — Migration + Verification + Ship

## Task 40: README — full v2 update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the contracts section** — move v1 contracts to a `## Deprecated v1 contracts` section at the bottom; add `## Deployed contracts (v2 — active)` with the new addresses; update the architecture diagram to reflect MCP-server + INFT.

- [ ] **Step 2: Update the architecture ASCII diagram**

```
                ┌────────────────────────────────────────┐
   Agent  ◄─►   │  cruciblebench.xyz/mcp  (Streamable)   │
   (signs       │  ├─ EIP-712 verifier → AgentINFT       │
   each tick)   │  ├─ Engine session (per runId)         │
                │  ├─ Spectator WS fanout                │
                │  └─ Auto-publish on done               │
                └────────────────────────────────────────┘
                            │
                            ▼
                ┌────────────────────────────────────────┐
                │  publishRunV2                          │
                │  ├─ trace+sigs → 0G Storage            │
                │  └─ score → RunRegistryV2 (INFT)       │
                └────────────────────────────────────────┘
```

- [ ] **Step 3: Update Quick Start** to point to the web flow (cruciblebench.xyz → connect → mint INFT → start run) instead of the CLI.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): v2 architecture — INFT + MCP, deprecated v1 section moved to bottom"
```

---

## Task 41: `contracts/deployed-addresses.json` — final v2 entries

(Most likely already done in Task 6's deploy step. Re-verify.)

- [ ] **Step 1: Confirm `galileoV2` block contains the live addresses for AgentINFT and RunRegistryV2.**
- [ ] **Step 2: Commit if changed.**

---

## Task 42: End-to-end smoke (manual)

**Goal:** Full flow works without intervention.

- [ ] **Step 1: Deploy v2 contracts to Galileo (Task 6 step 4)**
- [ ] **Step 2: Start hosted MCP server** (locally for smoke; production deploy is a separate concern)

```bash
cd packages/mcp-server && pnpm dev
```

- [ ] **Step 3: From `apps/web`, log in with a wallet that owns 0 INFTs, mint one via `/my-agents`**
- [ ] **Step 4: From `/agents/[tokenId]/start`, pick `choppy-range`, get the connection URL**
- [ ] **Step 5: From the TS reference example with the env vars from the connection guide, run `pnpm start`**
- [ ] **Step 6: Open `/runs/live/[runId]` in the browser — confirm live ticks**
- [ ] **Step 7: After completion, banner shows "Published as Run #N", click → `/runs/N` shows scorecard**
- [ ] **Step 8: Verify the run on `/leaderboard` and on `/scenarios/choppy-range?tab=leaderboard`**

If any step fails, fix and re-test before continuing.

---

## Task 43: `/verify/[runId]` smoke

- [ ] **Step 1: Open `/verify/[N]` for the run from Task 42**
- [ ] **Step 2: Click "Run audit"**
- [ ] **Step 3: Confirm: `rootMatches: true`, `allSigsOk: true`**

If `allSigsOk: false` — debug the signing path in the reference example or the verifier's domain construction.

---

# Self-Review Checklist

After implementing each phase, the engineer should re-read this checklist:

1. **Spec coverage**: every section in `docs/superpowers/specs/2026-05-14-inft-mcp-platform-design.md` is addressed by at least one task above. (Stretch: 0G Compute Managed Runtime is intentionally deferred to a future plan.)
2. **No placeholders**: every step shows actual code or actual commands; no "TODO" / "TBD" / "fill in".
3. **Type consistency**: types referenced across tasks (e.g. `EngineSession`, `Session`, `Action`, `EIP712Domain`) match their definitions.
4. **Test coverage**: every functional task has a failing test → implementation → passing test pattern. Web UI tasks rely on browser smoke (Task 42–43).

---

## Out of Scope (for v2 — explicit defers)

- 0G Compute Managed Runtime (stretch goal in spec; separate plan)
- Encrypted INFT metadata + TEE re-encryption transfers (waiting on 0G TEE oracle)
- A2A driver mode (different connection path, lower priority)
- AIverse marketplace integration (no public addresses yet)
- Mainnet deployment (Galileo only for v2)
- Multi-instance MCP server scaling (single Node service for v2)
- Mobile-first dashboard (responsive but desktop-first)

---

End of plan.


