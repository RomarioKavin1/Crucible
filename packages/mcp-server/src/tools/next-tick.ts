// packages/mcp-server/src/tools/next-tick.ts
import { z } from "zod";
import type { AgentINFTClient } from "@crucible/og-client";
import { recoverActionSigner, type EIP712Domain } from "../auth";
import type { SessionRegistry } from "../session";
import type { Observation } from "../engine-adapter";

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

export interface NextTickResult {
  tickId: number;
  fill?: unknown;
  observation?: Observation;
  ticksRemaining: number;
  done: boolean;
  scorecard?: unknown;
  traceJsonl?: string;        // Returned for the auto-publisher; not necessarily echoed to wire
  runUrl?: string;
}

export async function handleNextTick(deps: HandleNextTickDeps): Promise<NextTickResult> {
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
    runId: input.runId, tickId: input.tickId, nonce: BigInt(input.nonce),
  });
  session.engine.advance();

  if (session.engine.isDone()) {
    const { scorecard, traceJsonl } = session.engine.finalize();
    session.events.emit("tick", { tickId: input.tickId, action: input, fill, observation: null });
    session.events.emit("done", { scorecard, traceJsonl });
    return {
      tickId: input.tickId,
      fill,
      ticksRemaining: 0,
      done: true,
      scorecard,
      traceJsonl,
    };
  }

  const obs = session.engine.currentObservation();
  // Include the post-advance observation so spectators can chart price + equity.
  session.events.emit("tick", { tickId: input.tickId, action: input, fill, observation: obs });
  return {
    tickId: input.tickId,
    fill,
    observation: obs,
    ticksRemaining: obs.ticksRemaining,
    done: false,
  };
}
