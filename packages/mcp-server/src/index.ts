// packages/mcp-server/src/index.ts
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config";
import { buildMcpServer } from "./server";
import { SessionRegistry } from "./session";

async function main() {
  const cfg = await loadConfig();
  const sessions = new SessionRegistry();
  const mcp = buildMcpServer({ cfg, sessions });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  await mcp.connect(transport);

  const app = Fastify({ logger: true });

  // MCP endpoint — supports POST (requests) and GET (SSE stream)
  app.all("/v1*", async (req, reply) => {
    await transport.handleRequest(req.raw as any, reply.raw as any, req.body);
    reply.hijack();   // tell Fastify we own the response
  });

  app.get("/healthz", async () => ({ ok: true, service: "crucible-mcp", version: "2.0.0" }));

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  // logger already prints listening message
}

main().catch((err) => { console.error(err); process.exit(1); });
