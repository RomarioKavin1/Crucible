#!/usr/bin/env node
// crucible-bench — standalone CLI (no workspace deps)
// Pure-flag, multi-provider runner. No repo clone needed:
//   npx crucible-bench --scenario fakeout-pump --provider openai --model gpt-4o-mini
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ethers } from "ethers";
import {
  PROVIDERS,
  type Provider,
  DEFAULT_PROMPT,
  resolveApiKey,
  requiresApiKey,
  createDecider,
  explainMissingSdk,
  type AgentDecision,
} from "./llm.js";

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
      if (process.env[k] === undefined) {
        process.env[k] = v;
        count++;
      }
    }
    if (exists) {
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
  const equityStr = equity != null ? `equity=${fmtPrice(equity)}` : "";
  const price = obs["price"];
  const priceStr =
    action.kind !== "noop" && price != null ? `price=${fmtPrice(price)}` : "";
  return `  tick ${tickStr}/${totalStr}  → ${kindPad} ${qtyStr} ${priceStr.padEnd(18)} ${equityStr}`.trimEnd();
}

// ─── Pre-flight banner ────────────────────────────────────────────────────────

function printBanner(b: {
  ownerAddress: string;
  tokenId: string;
  network: { label: string; chainId: number; explorer: string };
  provider: string;
  model: string;
  scenario: string;
  promptSource: string;
  systemPrompt: string;
}): void {
  const promptLines = b.systemPrompt.trim().split("\n");
  const previewLines = promptLines.slice(0, 4);
  const omitted = Math.max(0, promptLines.length - previewLines.length);
  const indented = previewLines.map((l) => `      ${l.length > 92 ? l.slice(0, 92) + "…" : l}`).join("\n");
  const promptTail = omitted > 0 ? `\n      … (${omitted} more line${omitted === 1 ? "" : "s"})` : "";

  console.log(`\n┌─ Crucible Bench ─────────────────────────────────────────`);
  console.log(`│  Network    ${b.network.label}  ·  chain ${b.network.chainId}`);
  console.log(`│  Signer     ${b.ownerAddress}`);
  console.log(`│  AgentINFT  #${b.tokenId}`);
  console.log(`│  Scenario   ${b.scenario}`);
  console.log(`│  Provider   ${b.provider}`);
  console.log(`│  Model      ${b.model}`);
  console.log(`│  Prompt     ${b.promptSource}`);
  console.log(`└──────────────────────────────────────────────────────────`);
  console.log(`\n  System prompt preview:`);
  console.log(indented + promptTail);
  console.log("");
}

// ─── Defaults per provider (model picks) ──────────────────────────────────────

const DEFAULT_MODEL_FOR: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  openrouter: "meta-llama/llama-3.3-70b-instruct",
  ollama: "qwen2.5:32b",
  "openai-compatible": "",
};

// ─── Main bench command ───────────────────────────────────────────────────────

type BenchOpts = {
  scenario?: string;
  token?: string;
  provider?: Provider;
  model?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  promptFile?: string;
  framework?: string;
  agentVersion?: string;
  mcpUrl?: string;
  watch?: boolean;
};

async function runBench(opts: BenchOpts): Promise<void> {
  loadEnvFiles();

  // ─── Resolve config (flags → env → defaults) ─────────────────────────────
  const scenario =
    opts.scenario ?? process.env["SCENARIO"] ?? process.env["scenario"];
  const tokenId = opts.token ?? process.env["AGENT_TOKEN_ID"];
  const privateKey = process.env["AGENT_PRIVATE_KEY"];
  const mcpUrl =
    opts.mcpUrl ??
    process.env["CRUCIBLE_MCP_URL"] ??
    "https://mcp.cruciblebench.xyz/v1";
  const runRegistry =
    process.env["RUN_REGISTRY_V2"] ??
    "0x80C1496980BA1183f8368F6072a130D7B01eDA7D";

  const provider: Provider =
    opts.provider ?? (process.env["LLM_PROVIDER"] as Provider | undefined) ?? "anthropic";
  if (!PROVIDERS.includes(provider)) {
    console.error(`✗ Invalid provider "${provider}". Must be one of: ${PROVIDERS.join(", ")}`);
    process.exit(1);
  }

  const model =
    opts.model ??
    process.env["LLM_MODEL"] ??
    process.env["MODEL"] ??
    DEFAULT_MODEL_FOR[provider] ??
    "claude-haiku-4-5";
  const apiKey = resolveApiKey(provider, opts.llmApiKey);
  const baseUrl = opts.llmBaseUrl ?? process.env["LLM_BASE_URL"];
  const framework = opts.framework ?? process.env["FRAMEWORK"] ?? "crucible-bench";
  const agentVersion = opts.agentVersion ?? process.env["AGENT_VERSION"] ?? "";

  // System prompt: --prompt-file path, $LLM_PROMPT_FILE, or built-in default.
  let systemPrompt = DEFAULT_PROMPT;
  const promptFile = opts.promptFile ?? process.env["LLM_PROMPT_FILE"];
  if (promptFile) {
    const p = path.resolve(process.cwd(), promptFile);
    if (!existsSync(p)) {
      console.error(`✗ Prompt file not found: ${p}`);
      process.exit(1);
    }
    systemPrompt = readFileSync(p, "utf8");
    console.log(`▸ Loaded system prompt from ${p}`);
  }

  // ─── Validate required vars ──────────────────────────────────────────────
  const missing: string[] = [];
  if (!privateKey) missing.push("AGENT_PRIVATE_KEY");
  if (!tokenId) missing.push("AGENT_TOKEN_ID");
  if (!scenario) missing.push("SCENARIO (or --scenario flag)");
  if (requiresApiKey(provider) && !apiKey) {
    missing.push(`LLM API key for "${provider}" (--llm-api-key, $LLM_API_KEY, or the provider-specific env var)`);
  }

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

  // ─── Build LLM decider ───────────────────────────────────────────────────
  const decide = createDecider(
    { provider, model, apiKey, baseUrl },
    systemPrompt
  );

  // ─── Set up wallet (need this for the pre-flight banner) ─────────────────
  const wallet = new ethers.Wallet(privateKey!);

  // ─── Pre-flight banner ──────────────────────────────────────────────────
  // Network is hardcoded to Galileo testnet for now; flip to mainnet once
  // contracts are deployed and CRUCIBLE_NETWORK=mainnet is read here too.
  const network = {
    label: "0G Galileo (testnet)",
    chainId: 16602,
    explorer: "https://chainscan-galileo.0g.ai",
  };

  printBanner({
    ownerAddress: wallet.address,
    tokenId: tokenId!,
    network,
    provider,
    model,
    scenario: scenario!,
    promptSource: promptFile ? promptFile : "(built-in default)",
    systemPrompt,
  });

  // ─── Connect to MCP ──────────────────────────────────────────────────────
  console.log(`▸ Connecting to MCP at ${mcpUrl}`);
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  const client = new Client(
    { name: "crucible-bench", version: "0.2.2" },
    { capabilities: {} }
  );
  await client.connect(transport);

  const domain = {
    name: "CrucibleBench",
    version: "2",
    chainId: network.chainId,
    verifyingContract: runRegistry,
  };

  // ─── Start run ───────────────────────────────────────────────────────────
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

  // ─── Watch URL — always printed, --watch additionally opens browser ─────
  const webBase = process.env["CRUCIBLE_WEB_URL"] ?? "https://cruciblebench.xyz";
  const liveUrl = `${webBase}/runs/live/${runId}`;
  console.log(`\n✓ Run started: ${runId}`);
  console.log(`  Watch live: ${liveUrl}`);
  if (opts.watch) {
    console.log(`  (opening browser…)`);
    await openBrowser(liveUrl);
  }
  console.log("");

  // ─── Tick loop ───────────────────────────────────────────────────────────
  const totalTicks = (observation["totalTicks"] as number) ?? 150;

  while (true) {
    let action: AgentDecision;
    try {
      action = await decide(observation);
    } catch (err) {
      console.error(`\n✗ LLM call failed: ${explainMissingSdk(provider, err)}`);
      process.exit(1);
    }
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
      if (maxDD != null) console.log(`  Max DD:    ${(maxDD * 100).toFixed(2)}%`);
      if (runUrl) console.log(`  Run page:  ${runUrl}`);
      else console.log(`  Run page:  ${webBase}/runs/${runId}`);
      return;
    }

    observation = out.observation!;
    const tickId = observation["tickId"] as number;
    const ticksRemaining = observation["ticksRemaining"] as number;
    const computedTotal = tickId + ticksRemaining;
    console.log(fmtTick(tickId, computedTotal || totalTicks, action, observation));
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

/** Commander option parser that narrows string → Provider, throws if invalid. */
function parseProvider(value: string): Provider {
  if ((PROVIDERS as readonly string[]).includes(value)) return value as Provider;
  throw new InvalidArgumentError(`must be one of: ${PROVIDERS.join(", ")}`);
}

const program = new Command();

program
  .name("crucible-bench")
  .description(
    "Run an AI trading agent against Crucible Bench scenarios on 0G.\n" +
    "Works with any LLM provider — Anthropic, OpenAI, Google, Mistral, OpenRouter, Ollama, or any OpenAI-compatible endpoint.\n\n" +
    "  npx crucible-bench --scenario fakeout-pump --provider openai --model gpt-4o-mini --llm-api-key sk-... --watch\n\n" +
    "Credentials (AGENT_PRIVATE_KEY, AGENT_TOKEN_ID) come from ./crucible.env or ~/.crucible/config.env."
  )
  .version("0.2.2")
  // ── benchmark wiring ────────────────────────────────────────────────────
  .option("-s, --scenario <id>", "Scenario id (e.g. choppy-range, fakeout-pump, luna-collapse)")
  .option("-t, --token <id>", "AgentINFT tokenId (else reads AGENT_TOKEN_ID)")
  .option("--mcp-url <url>", "Override CRUCIBLE_MCP_URL")
  .option("--watch", "Open browser to live spectator after start")
  // ── llm provider (the new typed flags) ──────────────────────────────────
  .option(
    "--provider <name>",
    `LLM provider: ${PROVIDERS.join(" | ")}`,
    parseProvider
  )
  .option("-m, --model <id>", "Model id (defaults vary per provider; also recorded on chain)")
  .option("--llm-api-key <key>", "API key for the chosen provider (else read from env)")
  .option(
    "--llm-base-url <url>",
    "Override base URL (required for --provider openai-compatible; defaults set for openrouter/ollama)"
  )
  .option("--prompt-file <path>", "Path to a markdown/txt file used as the system prompt")
  // ── leaderboard metadata ────────────────────────────────────────────────
  .option("--framework <name>", "Framework name recorded on chain", "crucible-bench")
  .option("--agent-version <ver>", "Agent version string recorded on chain", "")
  .action(async (opts: BenchOpts) => {
    await runBench(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
