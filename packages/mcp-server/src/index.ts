// packages/mcp-server/src/index.ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config";
import { buildMcpServer } from "./server";
import { SessionRegistry } from "./session";
import { registerSpectator } from "./spectator";
import { registerPublishOnDone } from "./publish-on-done";

async function main() {
  const cfg = await loadConfig();
  const sessions = new SessionRegistry();
  registerPublishOnDone(sessions, cfg);   // attach BEFORE buildMcpServer so create wrap is in place

  const mcp = buildMcpServer({ cfg, sessions });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  await mcp.connect(transport);

  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.all("/v1*", async (req, reply) => {
    await transport.handleRequest(req.raw as any, reply.raw as any, req.body);
    reply.hijack();
  });

  app.get("/healthz", async () => ({ ok: true, service: "crucible-mcp", version: "2.0.0" }));

  registerSpectator(app, sessions);

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
}

main().catch((err) => { console.error(err); process.exit(1); });
