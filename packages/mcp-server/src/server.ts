// packages/mcp-server/src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "./config";
import { networkOf } from "./config";
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
    { name: "crucible-bench", version: "2.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "crucible.get_domain", description: "Return the EIP-712 domain to sign with (name, version, chainId, verifyingContract). Pass optional `network` (testnet|mainnet). Clients must call this first.",
        inputSchema: { type: "object", properties: { network: { type: "string", enum: ["testnet", "mainnet", "galileo"] } } } },
      { name: "crucible.list_scenarios", description: "List available scenarios",
        inputSchema: { type: "object", properties: {} } },
      { name: "crucible.start_run", description: "Start a new benchmark run; returns runId + tick 0 observation. Pass `network` to choose testnet or mainnet (defaults to server default).",
        inputSchema: { type: "object", properties: {
          scenarioId: { type: "string" }, tokenId: { type: "string" }, nonce: { type: "string" },
          signature: { type: "string" }, signer: { type: "string" },
          network: { type: "string", enum: ["testnet", "mainnet", "galileo"] },
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
      { name: "crucible.get_my_runs", description: "List published runs for a tokenId. Pass `network` to query mainnet vs testnet (defaults to server default).",
        inputSchema: { type: "object", properties: {
          tokenId: { type: "string" },
          network: { type: "string", enum: ["testnet", "mainnet", "galileo"] },
        }, required: ["tokenId"] }},
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const a = args as Record<string, unknown>;

    switch (name) {
      case "crucible.get_domain": {
        const net = networkOf(ctx.cfg, normalizeNetwork(a?.network));
        return { content: [{ type: "text", text: JSON.stringify(handleGetDomain(net.domain)) }] };
      }
      case "crucible.list_scenarios":
        return { content: [{ type: "text", text: JSON.stringify(await listScenarios(ctx.cfg.scenariosDir)) }] };
      case "crucible.start_run": {
        // start_run picks the network for the whole session.
        const requested = normalizeNetwork(a?.network);
        const net = networkOf(ctx.cfg, requested);
        const input = StartRunInput.parse(args);
        return { content: [{ type: "text", text: JSON.stringify(await handleStartRun({
          network: net.network,
          domain: net.domain, inft: net.inft, registry: ctx.sessions,
          scenariosDir: ctx.cfg.scenariosDir, webPublicUrl: ctx.cfg.webPublicUrl,
          input,
        })) }] };
      }
      case "crucible.next_tick": {
        // Session was created with a specific network — route via its config.
        const input = NextTickInput.parse(args);
        const sess = ctx.sessions.get(input.runId);
        const net = networkOf(ctx.cfg, sess.network);
        return { content: [{ type: "text", text: JSON.stringify(await handleNextTick({
          domain: net.domain, inft: net.inft, registry: ctx.sessions, input,
        })) }] };
      }
      case "crucible.abort_run": {
        const input = AbortRunInput.parse(args);
        const sess = ctx.sessions.get(input.runId);
        const net = networkOf(ctx.cfg, sess.network);
        return { content: [{ type: "text", text: JSON.stringify(await handleAbortRun({
          domain: net.domain, registry: ctx.sessions, input,
        })) }] };
      }
      case "crucible.get_my_runs": {
        const nKey = normalizeNetwork(a?.network);
        const net = networkOf(ctx.cfg, nKey);
        const passNet: "galileo" | "mainnet" | undefined =
          nKey === "galileo" || nKey === "mainnet" ? nKey : undefined;
        return { content: [{ type: "text", text: JSON.stringify(await handleGetMyRuns({
          registry: net.runRegistry, tokenId: BigInt(String(a?.tokenId)),
          webPublicUrl: ctx.cfg.webPublicUrl,
          network: passNet,
        })) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

/** Translate caller-facing names into internal Network values. `testnet` is an
 *  alias for `galileo` — keeps the public API friendly while internals use the
 *  network's canonical id. */
function normalizeNetwork(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  if (input === "testnet") return "galileo";
  return input;
}
