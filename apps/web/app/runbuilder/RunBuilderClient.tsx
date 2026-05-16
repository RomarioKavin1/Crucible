"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import useSWR from "swr";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { CopyableCommand } from "@crucible/ui-kit";
import {
  readTokensOf, readIntelligentData, readDelegations,
} from "@/lib/contracts";
import { InftMintForm } from "@/components/InftMintForm";
import { CredentialsGenerator } from "@/components/CredentialsGenerator";
import { CURRENT_NETWORK } from "@/lib/network";
import { EASE_OUT, DURATION, PRESS_BUTTON } from "@/lib/motion";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1";

type ScenarioRow = {
  id: string;
  title: string;
  asset: string;
  kind: "historical" | "synthetic";
  durationTicks: number;
};

type AgentRow = {
  tokenId: bigint;
  description: string;
  delegations: readonly `0x${string}`[];
};

type Step = "agent" | "scenario" | "configure";

export function RunBuilderClient({
  scenarios, initialAgent, initialScenario,
}: {
  scenarios: ScenarioRow[];
  initialAgent: string | null;
  initialScenario: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [selectedAgent, setSelectedAgent] = useState<bigint | null>(
    initialAgent ? BigInt(initialAgent) : null,
  );
  const [selectedScenario, setSelectedScenario] = useState<string | null>(
    initialScenario && scenarios.some((s) => s.id === initialScenario) ? initialScenario : null,
  );
  const [step, setStep] = useState<Step>(() => {
    if (!initialAgent) return "agent";
    if (!initialScenario) return "scenario";
    return "configure";
  });

  // Keep URL in sync so deep-links + back-button work.
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (selectedAgent !== null) next.set("agent", selectedAgent.toString());
    else next.delete("agent");
    if (selectedScenario) next.set("scenario", selectedScenario);
    else next.delete("scenario");
    const q = next.toString();
    router.replace(q ? `/runbuilder?${q}` : "/runbuilder", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, selectedScenario]);

  const scenario = selectedScenario ? scenarios.find((s) => s.id === selectedScenario) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium">
          Run a benchmark
        </div>
        <h1 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.02em] text-[#e6e9f0] leading-[1.05]">
          Three steps. Fully on-chain.
        </h1>
        <p className="text-[13.5px] text-[#aab2c5] leading-[1.6] max-w-xl">
          Pick an agent, pick a scenario, then either point your existing MCP-capable agent at our server
          or copy a ready-to-run command for the npm CLI.
        </p>
      </header>

      <StepTracker
        step={step}
        haveAgent={selectedAgent !== null}
        haveScenario={Boolean(selectedScenario)}
        onJump={(s) => {
          if (s === "agent") setStep("agent");
          if (s === "scenario" && selectedAgent !== null) setStep("scenario");
          if (s === "configure" && selectedAgent !== null && selectedScenario) setStep("configure");
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
        >
          {step === "agent" && (
            <StepAgent
              selected={selectedAgent}
              onSelect={(id) => {
                setSelectedAgent(id);
                setStep(selectedScenario ? "configure" : "scenario");
              }}
            />
          )}

          {step === "scenario" && (
            <StepScenario
              scenarios={scenarios}
              selected={selectedScenario}
              onSelect={(id) => {
                setSelectedScenario(id);
                setStep("configure");
              }}
              onBack={() => setStep("agent")}
            />
          )}

          {step === "configure" && scenario && selectedAgent !== null && (
            <StepConfigure
              scenario={scenario}
              agentTokenId={selectedAgent}
              onBack={() => setStep("scenario")}
              onChangeAgent={() => setStep("agent")}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Step tracker ───────────────────────────────────────────────────────────

function StepTracker({
  step, haveAgent, haveScenario, onJump,
}: {
  step: Step;
  haveAgent: boolean;
  haveScenario: boolean;
  onJump: (s: Step) => void;
}) {
  const steps: { id: Step; label: string; done: boolean; available: boolean }[] = [
    { id: "agent",     label: "Agent",     done: haveAgent,                    available: true },
    { id: "scenario",  label: "Scenario",  done: haveScenario,                 available: haveAgent },
    { id: "configure", label: "Run",       done: false,                         available: haveAgent && haveScenario },
  ];

  return (
    <LayoutGroup id="step-tracker">
      <ol className="flex items-center gap-2 sm:gap-3 text-[12px]">
        {steps.map((s, i) => {
          const active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                disabled={!s.available}
                onClick={() => s.available && onJump(s.id)}
                className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors disabled:cursor-not-allowed ${
                  active
                    ? "border-[#22d3ee55] bg-[#22d3ee0a] text-[#22d3ee]"
                    : s.done
                      ? "border-[#10b98140] bg-[#10b98108] text-[#10b981] hover:bg-[#10b98115]"
                      : "border-[#1c2538] text-[#6b7691] hover:text-[#aab2c5] hover:border-[#232d44] disabled:opacity-40 disabled:hover:text-[#6b7691] disabled:hover:border-[#1c2538]"
                }`}
              >
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold font-mono">
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="font-medium">{s.label}</span>
                {active && (
                  <motion.span
                    layoutId="step-active-pill"
                    className="absolute inset-0 rounded-full ring-1 ring-[#22d3ee44]"
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  />
                )}
              </button>
              {i < steps.length - 1 && (
                <span className="w-4 sm:w-8 h-px bg-[#1c2538]" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </LayoutGroup>
  );
}

// ─── Step 1 · Agent ─────────────────────────────────────────────────────────

function StepAgent({
  selected, onSelect,
}: {
  selected: bigint | null;
  onSelect: (id: bigint) => void;
}) {
  const { address, isConnected } = useAccount();
  const { data: agents, isLoading, mutate } = useSWR<AgentRow[]>(
    isConnected && address ? ["agents", address] : null,
    async () => {
      const tokenIds = await readTokensOf(address as `0x${string}`);
      return Promise.all(
        tokenIds.map(async (id) => {
          const [d, dels] = await Promise.all([
            readIntelligentData(id),
            readDelegations(id),
          ]);
          return { tokenId: id, description: d.description, delegations: dels };
        }),
      );
    },
  );

  if (!isConnected) {
    return (
      <Card title="Step 1 · Pick your agent">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-3">
          Connect your wallet to see your agents. Don&rsquo;t have any? You&rsquo;ll be able to mint one in
          the next click.
        </p>
        <ConnectButton />
      </Card>
    );
  }

  if (isLoading || !agents) {
    return (
      <Card title="Step 1 · Pick your agent">
        <div className="text-[12.5px] text-[#6b7691] italic">Loading your agents…</div>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card title="Step 1 · Mint your first agent">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-4">
          Your agent gets its own on-chain identity (ERC-7857 INFT) so every benchmark it runs is provably
          its own. One transaction, ~0.001 0G in gas.
        </p>
        <InftMintForm onMinted={(tokenId) => { mutate(); if (tokenId) onSelect(BigInt(tokenId)); }} />
      </Card>
    );
  }

  return (
    <Card title="Step 1 · Pick your agent">
      <ul className="space-y-2">
        {agents.map((a) => (
          <li key={a.tokenId.toString()}>
            <button
              type="button"
              onClick={() => onSelect(a.tokenId)}
              className={`w-full text-left bg-[#0a0e17] border rounded-lg px-4 py-3 transition-all ${
                selected === a.tokenId
                  ? "border-[#22d3ee55] bg-[#22d3ee08]"
                  : "border-[#1c2538] hover:border-[#232d44]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#e6e9f0] truncate">
                    {a.description || <span className="italic text-[#6b7691]">Unnamed agent</span>}
                  </div>
                  <div className="text-[11px] text-[#6b7691] font-mono mt-0.5">
                    Token #{a.tokenId.toString()} ·{" "}
                    {a.delegations.length > 0
                      ? <span className="text-[#10b981]">{a.delegations.length} delegated key{a.delegations.length === 1 ? "" : "s"}</span>
                      : <span className="text-[#fbbf24]">no delegation yet — you&rsquo;ll generate one in step 3</span>}
                  </div>
                </div>
                <span className="text-[11px] text-[#22d3ee] shrink-0">Select →</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-[#1c2538] mt-4 pt-4">
        <p className="text-[11.5px] text-[#6b7691] mb-2">Or:</p>
        <details className="bg-[#0a0e17] border border-[#1c2538] rounded-lg">
          <summary className="px-4 py-2.5 text-[12.5px] text-[#aab2c5] cursor-pointer hover:text-[#e6e9f0] transition-colors">
            + Mint another agent
          </summary>
          <div className="px-4 pb-4">
            <InftMintForm onMinted={(tokenId) => { mutate(); if (tokenId) onSelect(BigInt(tokenId)); }} />
          </div>
        </details>
      </div>
    </Card>
  );
}

// ─── Step 2 · Scenario ──────────────────────────────────────────────────────

function StepScenario({
  scenarios, selected, onSelect, onBack,
}: {
  scenarios: ScenarioRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scenarios;
    return scenarios.filter(
      (s) => s.id.includes(q) || s.title.toLowerCase().includes(q) || s.asset.toLowerCase().includes(q),
    );
  }, [scenarios, query]);

  return (
    <Card
      title="Step 2 · Pick a scenario"
      right={
        <button onClick={onBack} className="text-[11.5px] text-[#6b7691] hover:text-[#22d3ee] transition-colors">
          ← Change agent
        </button>
      }
    >
      <input
        type="search"
        placeholder="Search by name, asset, or id…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-[#0a0e17] border border-[#1c2538] rounded-lg px-3 py-2 text-[13px] text-[#e6e9f0] placeholder-[#3d4a6e] focus:border-[#22d3ee] focus:outline-none transition-colors mb-3"
      />
      {filtered.length === 0 ? (
        <div className="text-[12.5px] text-[#6b7691] italic p-4 text-center">No match.</div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full text-left bg-[#0a0e17] border rounded-lg px-3.5 py-3 transition-all ${
                  selected === s.id
                    ? "border-[#22d3ee55] bg-[#22d3ee08]"
                    : "border-[#1c2538] hover:border-[#232d44]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12.5px] font-medium text-[#e6e9f0] truncate">{s.title}</span>
                  <span className={`text-[9px] uppercase tracking-[0.08em] font-medium px-1.5 py-0.5 rounded border shrink-0 ${
                    s.kind === "historical"
                      ? "border-[#10b98140] text-[#10b981]"
                      : "border-[#fbbf2440] text-[#fbbf24]"
                  }`}>
                    {s.kind}
                  </span>
                </div>
                <div className="text-[10.5px] text-[#6b7691] font-mono">
                  {s.asset} · {s.durationTicks} ticks
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Step 3 · Configure & run ───────────────────────────────────────────────

type Provider = "anthropic" | "openai" | "google" | "openrouter" | "ollama";
type Platform = "macos" | "windows-ps" | "windows-cmd";

const PROVIDERS: { id: Provider; label: string; model: string; keyVar: string; extra?: string; keyHint?: string; keyUrl?: string }[] = [
  { id: "anthropic",  label: "Anthropic",       model: "claude-haiku-4-5",                  keyVar: "ANTHROPIC_API_KEY",            keyHint: "console.anthropic.com", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openai",     label: "OpenAI",          model: "gpt-4o-mini",                       keyVar: "OPENAI_API_KEY",               keyHint: "platform.openai.com",   keyUrl: "https://platform.openai.com/api-keys" },
  { id: "google",     label: "Google (Gemini)", model: "gemini-2.0-flash",                  keyVar: "GOOGLE_GENERATIVE_AI_API_KEY", keyHint: "aistudio.google.com",   keyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "openrouter", label: "OpenRouter",      model: "meta-llama/llama-3.3-70b-instruct", keyVar: "LLM_API_KEY",                  keyHint: "openrouter.ai/keys",    keyUrl: "https://openrouter.ai/keys" },
  { id: "ollama",     label: "Ollama (local)",  model: "qwen2.5:32b",                       keyVar: "",                             extra: " --llm-base-url http://localhost:11434/v1" },
];

const DEFAULT_PROMPT = `You are an active trader on a 150-tick benchmark scenario. **You MUST trade actively** — sitting at zero position the whole run wastes the benchmark.

Each tick you receive: { tickId, price, bid, ask, position, cash, equity, news, ticksRemaining }.

Rules:
- If position == 0 and you have cash, OPEN a long position with kind=market_buy, qty="500000000000000000" (= 0.5 ETH in wei) within the first 5 ticks.
- On sharp drops (price falls >2%), market_buy more at qty "300000000000000000" (0.3).
- On sharp rallies (price up >3%), market_sell qty "200000000000000000" (0.2) to take partial profit.
- React to news: bullish news → buy more, bearish news → sell.
- In the LAST 5 ticks: market_sell your entire current position to lock in PnL.

Reply with ONLY raw JSON:
{"kind":"market_buy"|"market_sell"|"noop","qty":"<wei-string>","reasoning":"one short sentence"}`;

function StepConfigure({
  scenario, agentTokenId, onBack, onChangeAgent,
}: {
  scenario: ScenarioRow;
  agentTokenId: bigint;
  onBack: () => void;
  onChangeAgent: () => void;
}) {
  const [path, setPath] = useState<"example" | "byo">("example");

  // Owner-only check — non-owners shouldn't see the credentials section.
  const { address } = useAccount();
  const { data: agent } = useSWR(
    ["agent-detail", agentTokenId.toString()],
    async () => {
      const [info, dels] = await Promise.all([
        readIntelligentData(agentTokenId),
        readDelegations(agentTokenId),
      ]);
      return { description: info.description, delegations: dels };
    },
  );

  return (
    <Card
      title={`Step 3 · ${path === "example" ? "Run the example" : "Bring your own agent"}`}
      right={
        <div className="flex items-center gap-3 text-[11.5px]">
          <button onClick={onChangeAgent} className="text-[#6b7691] hover:text-[#22d3ee] transition-colors">
            Change agent
          </button>
          <button onClick={onBack} className="text-[#6b7691] hover:text-[#22d3ee] transition-colors">
            ← Change scenario
          </button>
        </div>
      }
    >
      {/* Pill summary */}
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] mb-4">
        <span className="px-2.5 py-1 rounded-full bg-[#0a0e17] border border-[#1c2538] text-[#aab2c5]">
          <span className="text-[#6b7691]">Agent</span>{" "}
          <span className="font-mono text-[#e6e9f0]">#{agentTokenId.toString()}</span>
          {agent?.description && <span className="text-[#6b7691]"> · {agent.description}</span>}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#0a0e17] border border-[#1c2538] text-[#aab2c5]">
          <span className="text-[#6b7691]">Scenario</span>{" "}
          <span className="text-[#e6e9f0]">{scenario.title}</span>
        </span>
      </div>

      {/* Path tabs */}
      <LayoutGroup id="configure-path">
        <div className="flex gap-1 border-b border-[#1c2538] mb-4">
          {(["example", "byo"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPath(p)}
              className={`relative px-4 py-2 text-[12.5px] font-medium transition-colors ${
                path === p ? "text-[#22d3ee]" : "text-[#6b7691] hover:text-[#aab2c5]"
              }`}
            >
              {p === "example" ? "Use the example" : "I have my own agent"}
              {path === p && (
                <motion.span
                  layoutId="path-underline"
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-[#22d3ee]"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait">
        <motion.div
          key={path}
          initial={{ opacity: 0, filter: "blur(2px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
        >
          {path === "example" ? (
            <ExamplePath
              scenarioId={scenario.id}
              tokenId={agentTokenId}
              ownerView={Boolean(address)}
              hasDelegations={(agent?.delegations.length ?? 0) > 0}
            />
          ) : (
            <ByoPath tokenId={agentTokenId} scenarioId={scenario.id} />
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function ExamplePath({
  scenarioId, tokenId, ownerView, hasDelegations,
}: {
  scenarioId: string;
  tokenId: bigint;
  ownerView: boolean;
  hasDelegations: boolean;
}) {
  const [providerId, setProviderId] = useState<Provider>("anthropic");
  const [platform, setPlatform] = useState<Platform>("macos");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [showPrompt, setShowPrompt] = useState(false);

  // Hot wallet: either user already has one (keeps the 0x... placeholder so they
  // paste their own value), OR they generate one inline (auto-fills into exports).
  const [hotKeyMode, setHotKeyMode] = useState<"have" | "generate">(
    hasDelegations ? "have" : "generate",
  );
  const [generatedKey, setGeneratedKey] = useState<`0x${string}` | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  // The agent + delegations live on this specific 0G network. Include --network
  // in the generated npx command so the CLI hits the same chain — otherwise it
  // defaults to testnet and fails with UNAUTHORIZED when you minted on mainnet.
  const cliNetwork: "testnet" | "mainnet" =
    CURRENT_NETWORK.id === "mainnet" ? "mainnet" : "testnet";
  const networkLabel = CURRENT_NETWORK.label;

  // Build commands per platform — use the just-generated key if present.
  const promptArg = ` --prompt-file ./prompt.md`;
  const baseFlags = `--network ${cliNetwork} \\\n  --scenario ${scenarioId} \\\n  --provider ${provider.id} \\\n  --model ${provider.model}${provider.extra ?? ""} \\\n  --watch`;
  const keyValue = generatedKey ?? "0x...";
  const keyComment = generatedKey ? "        # just-generated hot key" : "        # delegated hot key";

  const exportsMacLinux = [
    `# Targeting ${networkLabel}`,
    `export AGENT_PRIVATE_KEY=${keyValue}${keyComment}`,
    `export AGENT_TOKEN_ID=${tokenId.toString()}`,
    provider.keyVar ? `export ${provider.keyVar}=sk-...` : `# no API key needed — Ollama runs locally`,
  ].filter(Boolean).join("\n");

  const exportsPS = [
    `# Targeting ${networkLabel}`,
    `$env:AGENT_PRIVATE_KEY = "${keyValue}"`,
    `$env:AGENT_TOKEN_ID = "${tokenId.toString()}"`,
    provider.keyVar ? `$env:${provider.keyVar} = "sk-..."` : `# no API key needed — Ollama runs locally`,
  ].filter(Boolean).join("\n");

  const exportsCmd = [
    `:: Targeting ${networkLabel}`,
    `set AGENT_PRIVATE_KEY=${keyValue}`,
    `set AGENT_TOKEN_ID=${tokenId.toString()}`,
    provider.keyVar ? `set ${provider.keyVar}=sk-...` : `:: no API key needed — Ollama runs locally`,
  ].filter(Boolean).join("\n");

  const runMacLinux = `npx crucible-bench \\\n  ${baseFlags.replaceAll("\\\n  ", "\\\n  ")}`;
  const runPS = `npx crucible-bench \`\n  ${baseFlags.replaceAll("\\\n  ", "\`\n  ")}`;
  const runCmd = `npx crucible-bench ^\n  ${baseFlags.replaceAll("\\\n  ", "^\n  ")}`;

  const exportsByPlatform: Record<Platform, string> = {
    "macos":       exportsMacLinux,
    "windows-ps":  exportsPS,
    "windows-cmd": exportsCmd,
  };
  const runByPlatform: Record<Platform, string> = {
    "macos":       runMacLinux,
    "windows-ps":  runPS,
    "windows-cmd": runCmd,
  };

  return (
    <div className="space-y-5">
      {/* Hot wallet — always offered. Two paths: "I have one" (paste it) or "Generate one". */}
      {ownerView && (
        <div className="bg-[#0a0e17] border border-[#1c2538] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1c2538]">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <h3 className="text-[12.5px] font-semibold text-[#e6e9f0]">Hot wallet (signing key)</h3>
              {generatedKey && (
                <span className="text-[10px] uppercase tracking-[0.1em] font-medium px-1.5 py-0.5 rounded bg-[#10b98115] border border-[#10b98140] text-[#10b981]">
                  ✓ Ready
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-[#aab2c5] leading-relaxed">
              The CLI uses this key to sign each tick. <strong className="text-[#e6e9f0] font-medium">No funds required</strong> — it pays no gas, the publisher covers all on-chain costs. Stored in your browser only.
            </p>
          </div>

          <LayoutGroup id="hotkey-mode">
            <div className="flex gap-1 px-2 pt-2 border-b border-[#1c2538]">
              {([
                { id: "have",     label: "I already have one" },
                { id: "generate", label: "Generate a new one" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setHotKeyMode(m.id)}
                  className={`relative px-3 py-2 text-[11.5px] font-medium transition-colors ${
                    hotKeyMode === m.id ? "text-[#22d3ee]" : "text-[#6b7691] hover:text-[#aab2c5]"
                  }`}
                >
                  {m.label}
                  {hotKeyMode === m.id && (
                    <motion.span
                      layoutId="hotkey-underline"
                      className="absolute -bottom-px left-0 right-0 h-[2px] bg-[#22d3ee]"
                      transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={hotKeyMode}
                initial={{ opacity: 0, filter: "blur(2px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
              >
                {hotKeyMode === "have" ? (
                  <div className="space-y-2">
                    <p className="text-[11.5px] text-[#aab2c5] leading-relaxed">
                      {hasDelegations ? (
                        <>This agent has{" "}
                          <span className="text-[#10b981] font-medium">
                            {/* unknown count here — but "at least one" is accurate */}
                            an authorized key
                          </span>. Paste its private key into{" "}
                          <code className="font-mono text-[#22d3ee]">0x...</code>{" "}
                          in the export commands below.
                        </>
                      ) : (
                        <>No delegations on this agent yet. If you already generated a key but never authorized it, switch to <span className="text-[#22d3ee]">Generate a new one</span> to do both in one tx.</>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11.5px] text-[#aab2c5] leading-relaxed">
                      We&rsquo;ll generate a fresh key in your browser, then send one transaction from your
                      owner wallet to authorize it. Takes ~10s. Once done, the export commands below auto-fill
                      with the new key.
                    </p>
                    <CredentialsGenerator
                      tokenId={tokenId}
                      onAuthorized={(pk) => setGeneratedKey(pk)}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Provider picker */}
      <Field label="LLM provider">
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProviderId(p.id)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors ${
                p.id === providerId
                  ? "border-[#22d3ee55] bg-[#22d3ee0a] text-[#22d3ee]"
                  : "border-[#1c2538] text-[#6b7691] hover:text-[#aab2c5] hover:border-[#232d44]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {provider.keyVar && provider.keyHint && (
          <p className="text-[11px] text-[#6b7691] mt-2">
            Need a key?{" "}
            <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-[#22d3ee] hover:underline">
              {provider.keyHint} ↗
            </a>
          </p>
        )}
      </Field>

      {/* Model (display only — comes from provider default) */}
      <Field label="Model" hint="Defaults to the lightest/quickest model for the provider. Override with --model.">
        <code className="font-mono text-[12px] text-[#e6e9f0] bg-[#0a0e17] border border-[#1c2538] rounded px-2 py-1 inline-block">
          {provider.model}
        </code>
      </Field>

      {/* System prompt — collapsed by default */}
      <Field
        label="System prompt"
        hint={showPrompt ? "Edits land in the trace as a meta header." : "Default is shown. Click to customize."}
        right={
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="text-[11px] text-[#22d3ee] hover:text-[#67e8f9] transition-colors"
          >
            {showPrompt ? "Hide" : "Customize"}
          </button>
        }
      >
        {showPrompt ? (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            className="w-full bg-[#0a0e17] border border-[#1c2538] rounded-lg px-3 py-2.5 text-[11.5px] text-[#e6e9f0] font-mono focus:border-[#22d3ee] focus:outline-none transition-colors leading-relaxed"
          />
        ) : (
          <div className="text-[11.5px] text-[#6b7691] italic">Built-in prompt — toggle to view and edit.</div>
        )}
      </Field>

      {/* Platform tabs */}
      <Field label="Your shell">
        <LayoutGroup id="platform-tabs">
          <div className="flex gap-1">
            {([
              { id: "macos",       label: "macOS / Linux" },
              { id: "windows-ps",  label: "Windows PowerShell" },
              { id: "windows-cmd", label: "Windows cmd" },
            ] as const).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`relative px-3 py-1.5 text-[11.5px] font-medium rounded-md transition-colors ${
                  platform === p.id
                    ? "text-[#22d3ee] bg-[#22d3ee0a]"
                    : "text-[#6b7691] hover:text-[#aab2c5] hover:bg-[#ffffff04]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </LayoutGroup>
      </Field>

      {/* The commands */}
      <Field label="Run it" hint="One time setup: install Node 20+ from nodejs.org if you don't have it. npx auto-downloads crucible-bench on first use.">
        <div className="space-y-2">
          {showPrompt && (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#6b7691] mb-1 font-medium">
                1 · Save the prompt
              </div>
              <CopyableCommand command={`cat > prompt.md <<'PROMPT'\n${prompt}\nPROMPT`} />
            </div>
          )}
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#6b7691] mb-1 font-medium">
              {showPrompt ? "2" : "1"} · Set env vars
            </div>
            <CopyableCommand command={exportsByPlatform[platform]} />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#6b7691] mb-1 font-medium">
              {showPrompt ? "3" : "2"} · Run the benchmark
            </div>
            <CopyableCommand command={`${runByPlatform[platform]}${showPrompt ? promptArg : ""}`} />
          </div>
        </div>
      </Field>

      <Note>
        <code className="font-mono text-[#22d3ee]">--watch</code> opens the live spectator. The CLI also
        prints a watch URL you can click from your terminal.
      </Note>
    </div>
  );
}

function ByoPath({ tokenId, scenarioId }: { tokenId: bigint; scenarioId: string }) {
  return (
    <div className="space-y-5">
      <Field label="MCP endpoint">
        <CopyableCommand command={MCP_URL} />
        <p className="text-[11.5px] text-[#aab2c5] mt-2 leading-relaxed">
          Streamable HTTP. Add as an MCP server in OpenClaw, Cursor, Claude Desktop, or your own client.
        </p>
      </Field>

      <Field label="Example: OpenClaw config (~/.openclaw/openclaw.json)">
        <CopyableCommand command={`{\n  "mcpServers": {\n    "crucible": { "url": "${MCP_URL}" }\n  }\n}`} />
      </Field>

      <Field label="Example: Cursor config (.cursor/mcp.json)">
        <CopyableCommand command={`{ "mcpServers": { "crucible": { "url": "${MCP_URL}" } } }`} />
      </Field>

      <Field label="How to call the tools">
        <ul className="text-[12px] text-[#aab2c5] space-y-1.5 leading-relaxed list-disc pl-5 marker:text-[#3d4a6e]">
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.get_domain</code> first — returns the
            EIP-712 domain you must sign against. No auth.
          </li>
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.start_run</code> with{" "}
            <code className="font-mono text-[#22d3ee]">{`{ scenarioId: "${scenarioId}", tokenId: "${tokenId.toString()}", nonce, signature, signer }`}</code>
          </li>
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.next_tick</code> per tick (sign each Action)
          </li>
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.abort_run</code> — optional
          </li>
        </ul>
      </Field>

      <Note>
        Your agent&rsquo;s wallet must be the owner of token #{tokenId.toString()} OR a delegated key.
        Set delegations on{" "}
        <Link href={`/agents/${tokenId.toString()}`} className="text-[#22d3ee] hover:underline">
          this agent&rsquo;s page
        </Link>.
        Full EIP-712 schema:{" "}
        <a
          href="https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md"
          target="_blank" rel="noopener noreferrer"
          className="text-[#22d3ee] hover:underline"
        >
          docs/protocol/v2.md ↗
        </a>
      </Note>
    </div>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

function Card({
  title, right, children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1c2538] flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[#e6e9f0]">{title}</h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  label, hint, right, children,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">
          {label}
        </label>
        {right}
      </div>
      {children}
      {hint && <p className="text-[10.5px] text-[#3d4a6e] mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0e17] border border-[#1c2538] rounded-md px-3 py-2 text-[11.5px] text-[#aab2c5] leading-relaxed">
      <span className="text-[#22d3ee]">ⓘ</span> {children}
    </div>
  );
}
