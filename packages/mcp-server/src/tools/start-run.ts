// packages/mcp-server/src/tools/start-run.ts
import path from "node:path";
import { z } from "zod";
import type { AgentINFTClient } from "@crucible/og-client";
import { recoverStartRunSigner, type EIP712Domain } from "../auth";
import { EngineSession } from "../engine-adapter";
import type { SessionRegistry } from "../session";

export const StartRunInput = z.object({
  scenarioId: z.string(),
  tokenId: z.string(),     // decimal as string (uint256 doesn't fit in number safely)
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
