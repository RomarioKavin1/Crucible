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
  return { aborted: true as const };
}
