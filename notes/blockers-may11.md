# Blockers — May 11 (late)

Three things are tangled and I'm not making progress un-tangling them
at 11pm.

1. **TeeML attestation format.** The live TeeML node emits a payload that
   doesn't match what the SDK example produces. I think the doc page I'm
   reading is for an older revision. Need to either find the right doc
   or sniff a real attestation and reverse-engineer the layout. Either
   way it eats half a day minimum.

2. **OpenClaw + agent harness.** I've been wiring the engine to call an
   agent via a stub `AgentRunner` interface, but I never actually proved
   the OpenClaw side end-to-end. If the OpenClaw config we're asking
   developers to write isn't valid, the whole skills layer is a fiction.
   I haven't run a single OpenClaw agent against this engine yet.

3. **Bigger thing — the design.** The spec in my head says "verifiable
   benchmark + AI coach + leaderboard." The repo on disk says "monorepo
   with five packages, two apps, three contracts, a chart component, a
   WebSocket server, and a stalled TEE module." I'm building a
   *codebase*, not a *product*. The shape feels wrong. The fact that
   the engine has no fills wired up and I'm already 80% through the
   timeline is a red flag.

Decision for tomorrow morning (May 12):
- Stop coding tonight.
- Spend the morning writing a proper design spec end-to-end.
- If the spec exposes that the current impl is wrong shape, scrap it and
  restart from the spec. 4 days is enough to build the *right* thing
  from scratch. It is NOT enough to keep grinding on the wrong thing
  and hope it converges.
