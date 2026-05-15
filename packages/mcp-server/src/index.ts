// packages/mcp-server/src/index.ts
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./config";
import { buildMcpServer } from "./server";
import { SessionRegistry } from "./session";
import { registerSpectator } from "./spectator";
import { registerPublishOnDone } from "./publish-on-done";

async function main() {
  const cfg = await loadConfig();
  const sessions = new SessionRegistry();
  registerPublishOnDone(sessions, cfg);

  // Multi-session pattern (canonical MCP SDK): one transport per client session.
  // First request must be `initialize` (no session header) → spin up a transport.
  // Subsequent requests carry `mcp-session-id` header → look up existing transport.
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.all("/v1", async (req, reply) => {
    const sessionHeader = req.headers["mcp-session-id"] as string | undefined;
    const isInit = isInitializeRequest(req.body);
    let transport: StreamableHTTPServerTransport;

    if (sessionHeader && transports.has(sessionHeader)) {
      transport = transports.get(sessionHeader)!;
    } else if (isInit) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { transports.set(id, transport); },
      });
      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };
      const mcp = buildMcpServer({ cfg, sessions });
      await mcp.connect(transport);
    } else {
      reply.code(400).send({ jsonrpc: "2.0", error: { code: -32000, message: "No session — initialize first" }, id: null });
      return;
    }

    reply.hijack();
    try {
      await transport.handleRequest(req.raw as any, reply.raw as any, req.body);
    } catch (err) {
      console.error(`[MCP] handleRequest threw:`, err);
      if (!reply.raw.writableEnded) {
        reply.raw.statusCode = 500;
        reply.raw.setHeader("content-type", "application/json");
        reply.raw.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: String(err) }, id: null }));
      }
    }
  });

  app.get("/healthz", async () => ({ ok: true, service: "crucible-mcp", version: "2.0.0" }));

  registerSpectator(app, sessions);

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
}

main().catch((err) => { console.error(err); process.exit(1); });
