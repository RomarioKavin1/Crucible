// agent.ts — Crucible Bench v2 reference agent (TypeScript)
//
// Customize the decide() function below to implement your trading strategy.
// Everything else (signing, MCP transport, tick loop) is boilerplate — leave it as-is.
import { config } from "dotenv";
config({ path: "./crucible.env" });

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import Anthropic from "@anthropic-ai/sdk";

const SERVER_URL = process.env["CRUCIBLE_MCP_URL"] ?? "http://localhost:8080/v1";
const SCENARIO   = process.env["SCENARIO"] ?? "choppy-range";
const TOKEN_ID   = process.env["AGENT_TOKEN_ID"] ?? "1";
const PK         = process.env["AGENT_PRIVATE_KEY"]!;
const RUN_REGISTRY_V2 = process.env["RUN_REGISTRY_V2"] ?? "0x80C1496980BA1183f8368F6072a130D7B01eDA7D";

const wallet = new ethers.Wallet(PK);
const anthropic = new Anthropic();

const domain = { name: "CrucibleBench", version: "2", chainId: 16602, verifyingContract: RUN_REGISTRY_V2 };
const ACTION_TYPES = { Action: [
  { name: "runId", type: "bytes32" }, { name: "tickId", type: "uint32" },
  { name: "kind", type: "string" },   { name: "qty", type: "uint256" },
  { name: "reasoning", type: "string" }, { name: "nonce", type: "uint256" },
]};
const START_RUN_TYPES = { StartRun: [
  { name: "scenarioId", type: "string" }, { name: "tokenId", type: "uint256" }, { name: "nonce", type: "uint256" },
]};

interface AgentDecision { kind: string; qty: bigint; reasoning: string; }

// ─── CUSTOMIZE THIS FUNCTION ─────────────────────────────────────────────────
// observation shape: { tickId, price, bid, ask, position, cash, equity, news, ticksRemaining }
// Return: { kind: "market_buy" | "market_sell" | "noop", qty: bigint (in wei), reasoning: string }

async function decide(observation: Record<string, unknown>): Promise<AgentDecision> {
  const remaining = (observation["ticksRemaining"] as number) ?? 0;
  const tickId    = (observation["tickId"] as number) ?? 0;
  const isEarly   = remaining > tickId * 2;
  const isLate    = remaining < 6;

  const r = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    system: `You are an active trader on a 150-tick benchmark scenario. **You MUST trade actively** — sitting at zero position the whole run wastes the benchmark.

Each tick you receive: { tickId, price, bid, ask, position, cash, equity, news, ticksRemaining }.

Rules:
- If position == 0 and you have cash, OPEN a long position with kind=market_buy, qty="500000000000000000" (= 0.5 ETH in wei) within the first 5 ticks.
- On sharp drops (price falls >2% over recent ticks), market_buy more at qty "300000000000000000" (0.3).
- On sharp rallies (price up >3%), market_sell qty "200000000000000000" (0.2) to take partial profit.
- React to news: bullish news → buy more, bearish news → sell.
- In the LAST 5 ticks (ticksRemaining < 6): market_sell your entire current position to lock in PnL.
- Otherwise noop is acceptable but rare — don't sit idle for more than 5 ticks at a time.

Reply with ONLY raw JSON, no prose, no markdown:
{"kind":"market_buy"|"market_sell"|"noop","qty":"<wei-string>","reasoning":"one short sentence"}`,
    messages: [{ role: "user", content: JSON.stringify({ ...observation, isEarly, isLate }) }],
  });

  const txt = (r.content[0] as { text: string }).text;
  const cleaned = txt.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
  const j = JSON.parse(cleaned) as { kind: string; qty?: string; reasoning?: string };
  return { kind: j.kind, qty: BigInt(j.qty ?? "0"), reasoning: j.reasoning ?? "" };
}

// ─── BOILERPLATE: signing + MCP tick loop ────────────────────────────────────

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "my-crucible-agent", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);

  let nonce = 1n;
  const startSig = await wallet.signTypedData(domain, START_RUN_TYPES, { scenarioId: SCENARIO, tokenId: BigInt(TOKEN_ID), nonce });
  const start = await client.callTool({ name: "crucible.start_run", arguments: {
    scenarioId: SCENARIO, tokenId: TOKEN_ID, nonce: nonce.toString(),
    signature: startSig, signer: wallet.address,
  }});
  const startData = JSON.parse(((start.content as { text: string }[])[0] ?? { text: "{}" }).text);
  let { runId } = startData as { runId: string };
  let observation = startData.observation as Record<string, unknown>;
  console.log(`Run started: ${runId} (${SCENARIO})`);

  while (true) {
    const action = await decide(observation);
    nonce += 1n;
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, {
      runId, tickId: observation["tickId"], kind: action.kind, qty: action.qty,
      reasoning: action.reasoning, nonce,
    });
    const r = await client.callTool({ name: "crucible.next_tick", arguments: {
      runId, tickId: observation["tickId"], kind: action.kind,
      qty: action.qty.toString(), reasoning: action.reasoning, nonce: nonce.toString(),
      signature: sig, signer: wallet.address,
    }});
    const out = JSON.parse(((r.content as { text: string }[])[0] ?? { text: "{}" }).text) as {
      done?: boolean; observation?: Record<string, unknown>; scorecard?: unknown;
    };
    if (out.done) { console.log(`Done.`, out.scorecard); return; }
    observation = out.observation!;
    console.log(`tick ${observation["tickId"]} (remaining ${observation["ticksRemaining"]}) → ${action.kind} qty=${action.qty.toString()}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
