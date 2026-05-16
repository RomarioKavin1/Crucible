// examples/reference-agent-ts/agent.ts
//
// Reference TS agent for Crucible Bench v2 — provider-agnostic.
// Connects via MCP, signs every action with the wallet's private key, runs to done.
// Customize strategy.ts and prompt.md; this file is the boilerplate loop.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decide, meta } from "./strategy.js";

const SERVER_URL = process.env.CRUCIBLE_MCP_URL ?? "http://localhost:8080/v1";
const SCENARIO   = process.env.SCENARIO ?? "choppy-range";
const TOKEN_ID   = process.env.AGENT_TOKEN_ID ?? "1";
const PK         = process.env.AGENT_PRIVATE_KEY!;
const NETWORK    = (process.env.NETWORK ?? "testnet") as "testnet" | "mainnet";

const wallet = new ethers.Wallet(PK);

const ACTION_TYPES = { Action: [
  { name: "runId", type: "bytes32" }, { name: "tickId", type: "uint32" },
  { name: "kind", type: "string" },   { name: "qty", type: "uint256" },
  { name: "reasoning", type: "string" }, { name: "nonce", type: "uint256" },
]};
const START_RUN_TYPES = { StartRun: [
  { name: "scenarioId", type: "string" }, { name: "tokenId", type: "uint256" }, { name: "nonce", type: "uint256" },
]};

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "reference-agent-ts", version: "0.2.0" }, { capabilities: {} });
  await client.connect(transport);

  // Fetch the server's EIP-712 domain for the target network.
  const dom = await client.callTool({ name: "crucible.get_domain", arguments: { network: NETWORK } });
  const domain = JSON.parse((dom.content as any[])[0].text);

  let nonce = 1n;
  const startSig = await wallet.signTypedData(domain, START_RUN_TYPES, { scenarioId: SCENARIO, tokenId: BigInt(TOKEN_ID), nonce });
  // Read prompt.md so it can be embedded into the trace for transparency.
  let systemPrompt = "";
  try { systemPrompt = readFileSync(resolve(process.cwd(), "prompt.md"), "utf8"); } catch {}
  const start = await client.callTool({ name: "crucible.start_run", arguments: {
    scenarioId: SCENARIO, tokenId: TOKEN_ID, nonce: nonce.toString(),
    signature: startSig, signer: wallet.address,
    network: NETWORK,
    model: meta.model, framework: meta.framework, agentVersion: meta.agentVersion,
    provider: process.env.LLM_PROVIDER ?? "anthropic",
    systemPrompt,
  }});
  const startData = JSON.parse((start.content as any[])[0].text);
  let { runId } = startData;
  let observation = startData.observation;
  console.log(`Run started: ${runId} (${SCENARIO}) — model=${meta.model}`);

  while (true) {
    const action = await decide(observation);
    nonce += 1n;
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, {
      runId, tickId: observation.tickId, kind: action.kind, qty: action.qty,
      reasoning: action.reasoning, nonce,
    });
    const r = await client.callTool({ name: "crucible.next_tick", arguments: {
      runId, tickId: observation.tickId, kind: action.kind,
      qty: action.qty.toString(), reasoning: action.reasoning, nonce: nonce.toString(),
      signature: sig, signer: wallet.address,
    }});
    const out = JSON.parse((r.content as any[])[0].text);
    if (out.done) { console.log(`Done.`, out.scorecard); return; }
    observation = out.observation;
    console.log(`tick ${observation.tickId} (remaining ${observation.ticksRemaining}) → ${action.kind} qty=${action.qty.toString()}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
