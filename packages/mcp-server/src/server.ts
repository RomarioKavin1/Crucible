// packages/mcp-server/src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "./config";
import { SessionRegistry } from "./session";
import { listScenarios } from "./tools/list-scenarios";
import { handleStartRun, StartRunInput } from "./tools/start-run";
import { handleNextTick, NextTickInput } from "./tools/next-tick";
import { handleAbortRun, AbortRunInput } from "./tools/abort-run";
import { handleGetMyRuns } from "./tools/get-my-runs";
import { handleGetDomain } from "./tools/get-domain";

export interface McpServerCtx {
  cfg: ServerConfig;
  sessions: SessionRegistry;
}

export function buildMcpServer(ctx: McpServerCtx): Server {
  const server = new Server(
    { name: "crucible-bench", version: "2.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "crucible.get_domain", description: "Return the EIP-712 domain to sign with (name, version, chainId, verifyingContract). Clients must call this first.",
        inputSchema: { type: "object", properties: {} } },
      { name: "crucible.list_scenarios", description: "List available scenarios",
        inputSchema: { type: "object", properties: {} } },
      { name: "crucible.start_run", description: "Start a new benchmark run; returns runId + tick 0 observation",
        inputSchema: { type: "object", properties: {
          scenarioId: { type: "string" }, tokenId: { type: "string" }, nonce: { type: "string" },
          signature: { type: "string" }, signer: { type: "string" },
        }, required: ["scenarioId","tokenId","nonce","signature","signer"] }},
      { name: "crucible.next_tick", description: "Submit signed action for current tick; receive next observation",
        inputSchema: { type: "object", properties: {
          runId: { type: "string" }, tickId: { type: "number" },
          kind: { type: "string", enum: ["market_buy","market_sell","noop"] },
          qty: { type: "string" }, reasoning: { type: "string" }, nonce: { type: "string" },
          signature: { type: "string" }, signer: { type: "string" },
        }, required: ["runId","tickId","kind","qty","nonce","signature","signer"] }},
      { name: "crucible.abort_run", description: "Cancel a run",
        inputSchema: { type: "object", properties: {
          runId: { type: "string" }, reason: { type: "string" }, nonce: { type: "string" },
          signature: { type: "string" }, signer: { type: "string" },
        }, required: ["runId","nonce","signature","signer"] }},
      { name: "crucible.get_my_runs", description: "List published runs for a tokenId",
        inputSchema: { type: "object", properties: {
          tokenId: { type: "string" },
        }, required: ["tokenId"] }},
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    switch (name) {
      case "crucible.get_domain":
        return { content: [{ type: "text", text: JSON.stringify(handleGetDomain(ctx.cfg.domain)) }] };
      case "crucible.list_scenarios":
        return { content: [{ type: "text", text: JSON.stringify(await listScenarios(ctx.cfg.scenariosDir)) }] };
      case "crucible.start_run":
        return { content: [{ type: "text", text: JSON.stringify(await handleStartRun({
          domain: ctx.cfg.domain, inft: ctx.cfg.inft, registry: ctx.sessions,
          scenariosDir: ctx.cfg.scenariosDir, webPublicUrl: ctx.cfg.webPublicUrl,
          input: StartRunInput.parse(args),
        })) }] };
      case "crucible.next_tick":
        return { content: [{ type: "text", text: JSON.stringify(await handleNextTick({
          domain: ctx.cfg.domain, inft: ctx.cfg.inft, registry: ctx.sessions,
          input: NextTickInput.parse(args),
        })) }] };
      case "crucible.abort_run":
        return { content: [{ type: "text", text: JSON.stringify(await handleAbortRun({
          domain: ctx.cfg.domain, registry: ctx.sessions, input: AbortRunInput.parse(args),
        })) }] };
      case "crucible.get_my_runs":
        return { content: [{ type: "text", text: JSON.stringify(await handleGetMyRuns({
          registry: ctx.cfg.runRegistry, tokenId: BigInt((args as any).tokenId),
          webPublicUrl: ctx.cfg.webPublicUrl,
        })) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
