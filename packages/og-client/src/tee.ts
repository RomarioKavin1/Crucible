// TeeML integration sketch. Not working yet.
//
// Status (May 11, very late):
//   - The TeeML node we're pointing at returns a 502 about half the time;
//     when it does respond, the attestation payload uses a field layout
//     I can't find in the docs.
//   - Tried two SDK versions, neither matches what the live node emits.
//   - Re-tried with the OpenAI-compatible path — different signing scheme,
//     would also need a new contract verifier.
//   - I think the cleanest cut for the hackathon is: ship Compete-mode with
//     a trusted-attester signing key for v1, document it, and migrate to
//     full TeeML post-deadline.
//
// Leaving this file as a marker of where the integration stalls.

export interface TeeAttestation {
  readonly digest: string;
  readonly signature: string;
  readonly attester: string;
}

export interface TeeRunRequest {
  readonly scenarioId: string;
  readonly agentId: number;
  readonly recipeHash: string;
}

export async function runInTee(_req: TeeRunRequest): Promise<TeeAttestation> {
  throw new Error("TeeML integration WIP — see comment in tee.ts");
}
