#!/usr/bin/env node
// crucible-bench — standalone CLI (no workspace deps)
// Extracted from apps/cli bench + env-loader logic.
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import Anthropic from "@anthropic-ai/sdk";

// ─── Env loader ───────────────────────────────────────────────────────────────

const ENV_LINE = /^([A-Z_][A-Z0-9_]*)=(.*)$/;

function parseEnvFile(p: string): Record<string, string> {
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = ENV_LINE.exec(trimmed);
    if (m) out[m[1]!] = m[2]!.replace(/^["'](.*)["']$/, "$1").trim();
  }
  return out;
}

/** Load env files in precedence: ~/.crucible/config.env → ./crucible.env → process.env. */
function loadEnvFiles(): void {
  const sources = [
    path.join(homedir(), ".crucible", "config.env"),
    path.resolve(process.cwd(), "crucible.env"),
  ];
  for (const p of sources) {
    const exists = existsSync(p);
    const label = exists ? "loaded" : "skipped, not present";
    console.log(`▸ Loading env: ${p} (${label})`);
    if (!exists) continue;
    const vars = parseEnvFile(p);
    let count = 0;
    for (const [k, v] of Object.entries(vars)) {
      // Don't overwrite if already in process.env (shell beats file)
      if (process.env[k] === undefined) {
        process.env[k] = v;
        count++;
      }
    }
    if (exists) {
      // re-print with count
      process.stdout.write(`\x1b[1A\x1b[2K▸ Loading env: ${p} (loaded ${count} keys)\n`);
    }
  }
}

// ─── EIP-712 type definitions ─────────────────────────────────────────────────

const ACTION_TYPES = {
  Action: [
    { name: "runId", type: "bytes32" },
    { name: "tickId", type: "uint32" },
    { name: "kind", type: "string" },
    { name: "qty", type: "uint256" },
    { name: "reasoning", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
};

const START_RUN_TYPES = {
  StartRun: [
    { name: "scenarioId", type: "string" },
    { name: "tokenId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

interface AgentDecision {
  kind: string;
  qty: bigint;
  reasoning: string;
}

// ─── Agent decide() — mirrors reference-agent-ts verbatim ────────────────────

async function decide(
  anthropic: Anthropic,
  model: string,
  observation: Record<string, unknown>
): Promise<AgentDecision> {
  const remaining = (observation["ticksRemaining"] as number) ?? 0;
  const tickId = (observation["tickId"] as number) ?? 0;
  const isEarly = remaining > tickId * 2;
  const isLate = remaining < 6;

  const r = await anthropic.messages.create({
    model,
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
    messages: [
      {
        role: "user",
        content: JSON.stringify({ ...observation, isEarly, isLate }),
      },
    ],
  });

  const txt = (r.content[0] as { text: string }).text;
  const cleaned = txt.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
  const j = JSON.parse(cleaned) as {
    kind: string;
    qty?: string;
    reasoning?: string;
  };
  return {
    kind: j.kind,
    qty: BigInt(j.qty ?? "0"),
    reasoning: j.reasoning ?? "",
  };
}

// ─── Browser opener ───────────────────────────────────────────────────────────

async function openBrowser(url: string): Promise<void> {
  const cp = await import("node:child_process");
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  cp.spawn(opener, [url], { stdio: "ignore", detached: true }).unref();
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPrice(n: unknown): string {
  const num = typeof n === "number" ? n : parseFloat(String(n ?? 0));
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(3);
}

function fmtTick(
  tickId: number,
  total: number,
  action: AgentDecision,
  obs: Record<string, unknown>
): string {
  const tickStr = String(tickId).padStart(3);
  const totalStr = String(total);
  const kindPad = action.kind.padEnd(12);
  const qtyStr =
    action.kind === "noop" ? "".padEnd(16) : `qty=${fmtQty(action.qty)}`.padEnd(16);
  const equity = obs["equity"];
  const equityStr =
    equity != null ? `equity=${fmtPrice(equity)}` : "";
  const price = obs["price"];
  const priceStr =
    action.kind !== "noop" && price != null ? `price=${fmtPrice(price)}` : "";
  return `  tick ${tickStr}/${totalStr}  → ${kindPad} ${qtyStr} ${priceStr.padEnd(18)} ${equityStr}`.trimEnd();
}

// ─── Main bench command ───────────────────────────────────────────────────────

async function runBench(opts: {
  scenario?: string;
  token?: string;
  model?: string;
  framework?: string;
  agentVersion?: string;
  mcpUrl?: string;
  watch?: boolean;
}): Promise<void> {
  // 1. Load env files (global → project → shell already in process.env)
  loadEnvFiles();

  // 2. Resolve values from CLI flags → env
  const scenario =
    opts.scenario ?? process.env["SCENARIO"] ?? process.env["scenario"];
  const tokenId = opts.token ?? process.env["AGENT_TOKEN_ID"];
  const privateKey = process.env["AGENT_PRIVATE_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  const mcpUrl =
    opts.mcpUrl ??
    process.env["CRUCIBLE_MCP_URL"] ??
    "https://mcp.cruciblebench.xyz/v1";
  const runRegistry =
    process.env["RUN_REGISTRY_V2"] ??
    "0x80C1496980BA1183f8368F6072a130D7B01eDA7D";
  const model = opts.model ?? process.env["MODEL"] ?? "claude-haiku-4-5";
  const framework = opts.framework ?? process.env["FRAMEWORK"] ?? "crucible-bench";
  const agentVersion = opts.agentVersion ?? process.env["AGENT_VERSION"] ?? "";

  // 3. Validate required vars
  const missing: string[] = [];
  if (!privateKey) missing.push("AGENT_PRIVATE_KEY");
  if (!tokenId) missing.push("AGENT_TOKEN_ID");
  if (!anthropicKey) missing.push("ANTHROPIC_API_KEY");
  if (!scenario) missing.push("SCENARIO (or --scenario flag)");

  if (missing.length > 0) {
    console.error(`\n✗ Missing required configuration:\n`);
    for (const m of missing) console.error(`  • ${m}`);
    if (tokenId) {
      console.error(
        `\n  Download credentials at: https://cruciblebench.xyz/agents/${tokenId}\n`
      );
    } else {
      console.error(
        `\n  Visit https://cruciblebench.xyz/my-agents to mint or manage your AgentINFT.\n`
      );
    }
    process.exit(1);
  }

  // 4. Connect to MCP
  console.log(`▸ Connecting to MCP at ${mcpUrl}`);
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  const client = new Client(
    { name: "crucible-bench", version: "0.1.0" },
    { capabilities: {} }
  );
  await client.connect(transport);

  // 5. Set up ethers wallet
  const wallet = new ethers.Wallet(privateKey!);
  console.log(
    `▸ Authenticating as tokenId=${tokenId} signer=${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)}`
  );

  const domain = {
    name: "CrucibleBench",
    version: "2",
    chainId: 16602,
    verifyingContract: runRegistry,
  };

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  // 6. Start run
  let nonce = 1n;
  const startSig = await wallet.signTypedData(domain, START_RUN_TYPES, {
    scenarioId: scenario!,
    tokenId: BigInt(tokenId!),
    nonce,
  });

  const startResult = await client.callTool({
    name: "crucible.start_run",
    arguments: {
      scenarioId: scenario!,
      tokenId: tokenId!,
      nonce: nonce.toString(),
      signature: startSig,
      signer: wallet.address,
      model,
      framework,
      agentVersion,
    },
  });

  const startData = JSON.parse(
    ((startResult.content as { text: string }[])[0] ?? { text: "{}" }).text
  ) as {
    runId: string;
    observation: Record<string, unknown>;
    runUrl?: string;
  };

  const { runId } = startData;
  let observation = startData.observation;

  console.log(`✓ Run started: ${runId}`);

  // 7. Open watch URL if requested
  const webBase =
    process.env["CRUCIBLE_WEB_URL"] ?? "https://cruciblebench.xyz";
  const liveUrl = `${webBase}/runs/live/${runId}`;
  if (opts.watch) {
    console.log(`▸ Watch live: ${liveUrl}`);
    console.log(`  (opening in browser)`);
    await openBrowser(liveUrl);
  }

  // 8. Tick loop
  const totalTicks = (observation["totalTicks"] as number) ?? 150;

  while (true) {
    const action = await decide(anthropic, model, observation);
    nonce += 1n;

    const sig = await wallet.signTypedData(domain, ACTION_TYPES, {
      runId,
      tickId: observation["tickId"],
      kind: action.kind,
      qty: action.qty,
      reasoning: action.reasoning,
      nonce,
    });

    const tickResult = await client.callTool({
      name: "crucible.next_tick",
      arguments: {
        runId,
        tickId: observation["tickId"],
        kind: action.kind,
        qty: action.qty.toString(),
        reasoning: action.reasoning,
        nonce: nonce.toString(),
        signature: sig,
        signer: wallet.address,
      },
    });

    const out = JSON.parse(
      ((tickResult.content as { text: string }[])[0] ?? { text: "{}" }).text
    ) as {
      done?: boolean;
      observation?: Record<string, unknown>;
      scorecard?: Record<string, unknown>;
      runUrl?: string;
    };

    if (out.done) {
      // 9. Print scorecard
      console.log(`\n✓ Done.`);
      const sc = out.scorecard ?? {};
      const sortino = sc["sortino"] as number | undefined;
      const totalReturn = sc["totalReturnPct"] as number | undefined;
      const maxDD = sc["maxDrawdownPct"] as number | undefined;
      const pnl = sc["pnlAbsolute"] as number | undefined;
      const runUrl = out.runUrl ?? startData.runUrl;

      if (sortino != null)
        console.log(`  Sortino:   ${sortino >= 0 ? "+" : ""}${sortino.toFixed(2)}`);
      if (pnl != null && totalReturn != null) {
        const sign = pnl >= 0 ? "+" : "";
        console.log(
          `  PnL:       ${sign}${fmtPrice(pnl)}  (${sign}${(totalReturn * 100).toFixed(2)}%)`
        );
      } else if (totalReturn != null) {
        const sign = totalReturn >= 0 ? "+" : "";
        console.log(`  Return:    ${sign}${(totalReturn * 100).toFixed(2)}%`);
      }
      if (maxDD != null)
        console.log(`  Max DD:    ${(maxDD * 100).toFixed(2)}%`);
      if (runUrl) console.log(`  Run page:  ${runUrl}`);
      else console.log(`  Run page:  ${webBase}/runs/${runId}`);
      return;
    }

    observation = out.observation!;
    const tickId = observation["tickId"] as number;
    const ticksRemaining = observation["ticksRemaining"] as number;
    const computedTotal = tickId + ticksRemaining;
    console.log(
      fmtTick(tickId, computedTotal || totalTicks, action, observation)
    );
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const program = new Command();

program
  .name("crucible-bench")
  .description(
    "Run an AI trading agent against Crucible Bench scenarios on 0G.\n" +
    "Source crucible.env first (or set env vars), then:\n\n" +
    "  crucible-bench --scenario fakeout-pump --watch"
  )
  .version("0.1.0")
  .option("-s, --scenario <id>", "Scenario id (e.g. choppy-range)")
  .option("-t, --token <id>", "AgentINFT tokenId (else reads AGENT_TOKEN_ID)")
  .option("-m, --model <id>", "Model id recorded on chain (also used for Anthropic API)", "claude-haiku-4-5")
  .option("--framework <name>", "Framework name recorded on chain", "crucible-bench")
  .option("--agent-version <ver>", "Agent version string recorded on chain", "")
  .option("--mcp-url <url>", "Override CRUCIBLE_MCP_URL")
  .option("--watch", "Open browser to live spectator after start")
  .action(async (opts: {
    scenario?: string;
    token?: string;
    model?: string;
    framework?: string;
    agentVersion?: string;
    mcpUrl?: string;
    watch?: boolean;
  }) => {
    await runBench(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
