// packages/mcp-server/src/tools/start-run.ts
import path from "node:path";
import { z } from "zod";
import type { AgentINFTClient, Network } from "@crucible/og-client";
import { recoverStartRunSigner, type EIP712Domain } from "../auth";
import { EngineSession } from "../engine-adapter";
import type { SessionRegistry } from "../session";

export const StartRunInput = z.object({
  scenarioId: z.string(),
  tokenId: z.string(),     // decimal as string (uint256 doesn't fit in number safely)
  nonce: z.string(),
  signature: z.string(),
  signer: z.string(),
  // Network selection — handled at the server layer (caller resolves with networkOf());
  // present here so it doesn't fail zod parse if clients send it.
  network: z.enum(["testnet", "mainnet", "galileo"]).optional(),
  // Self-described agent metadata (optional — defaults to "unknown")
  model: z.string().optional(),
  framework: z.string().optional(),
  agentVersion: z.string().optional(),
  // Run-disclosure: embedded verbatim into trace.jsonl as a meta header line.
  // Not signed, not on chain — purely for auditor transparency.
  provider: z.string().optional(),
  systemPrompt: z.string().optional(),
});
export type StartRunInputT = z.infer<typeof StartRunInput>;

export interface HandleStartRunDeps {
  /** Network resolved by the server layer; persisted on the session. */
  network: Network;
  domain: EIP712Domain;
  inft: AgentINFTClient;
  registry: SessionRegistry;
  scenariosDir?: string;
  startEngine?: (scenarioDir: string) => Promise<EngineSession>;
  input: StartRunInputT;
  webPublicUrl?: string;
}

export interface StartRunResult {
  runId: string;
  ticksRemaining: number;
  observation: ReturnType<EngineSession["currentObservation"]>;
  spectatorUrl: string;
}

export async function handleStartRun(deps: HandleStartRunDeps): Promise<StartRunResult> {
  const { domain, inft, registry, input } = deps;
  const scenariosDir = deps.scenariosDir ?? path.resolve(process.cwd(), "scenarios");
  const startEngine = deps.startEngine ?? ((dir: string) => EngineSession.init({ scenarioDir: dir }));
  const webPublicUrl = deps.webPublicUrl ?? "http://localhost:3001";

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
  const runId = registry.create({
    network: deps.network,
    tokenId, signer: recovered, scenarioId: input.scenarioId, engine,
    model: input.model, framework: input.framework, agentVersion: input.agentVersion,
    provider: input.provider, systemPrompt: input.systemPrompt,
  });
  // Mark the start_run nonce as consumed so the next signed call (next_tick)
  // expects nonce+1. Without this, the agent would have to either re-use nonce 1
  // (replay risk) or know to skip a number — both fragile.
  registry.checkAndAdvanceNonce(runId, nonce);
  const obs = engine.currentObservation();

  return {
    runId,
    ticksRemaining: obs.ticksRemaining,
    observation: obs,
    spectatorUrl: `${webPublicUrl}/runs/live/${runId}`,
  };
}
