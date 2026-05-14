// packages/mcp-server/src/spectator.ts
import type { FastifyInstance } from "fastify";
import type { SessionRegistry } from "./session";

export function registerSpectator(app: FastifyInstance, sessions: SessionRegistry) {
  app.get("/spectate/:runId", { websocket: true }, (conn, req) => {
    const runId = (req.params as any).runId as string;
    let session;
    try { session = sessions.get(runId); }
    catch {
      conn.send(JSON.stringify({ type: "error", reason: "UNKNOWN_RUN" }));
      conn.close();
      return;
    }

    const send = (type: string, payload: unknown) => {
      try { conn.send(JSON.stringify({ type, payload, ts: Date.now() })); } catch {}
    };
    send("hello", { runId, tokenId: session.tokenId.toString(), scenarioId: session.scenarioId, status: session.status });

    const onTick = (ev: any) => send("tick", ev);
    const onDone = (ev: any) => send("done", ev);
    const onAbort = (ev: any) => send("abort", ev);
    const onPublished = (ev: any) => send("published", ev);
    const onPublishFailed = (ev: any) => send("publish_failed", ev);
    session.events.on("tick", onTick);
    session.events.on("done", onDone);
    session.events.on("abort", onAbort);
    session.events.on("published", onPublished);
    session.events.on("publish_failed", onPublishFailed);

    conn.on("close", () => {
      session.events.off("tick", onTick);
      session.events.off("done", onDone);
      session.events.off("abort", onAbort);
      session.events.off("published", onPublished);
      session.events.off("publish_failed", onPublishFailed);
    });
  });
}
