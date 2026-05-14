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
