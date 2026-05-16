"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { CopyableCommand } from "@crucible/ui-kit";
import {
  MODAL_PANEL, MODAL_BACKDROP, TAB_BODY, PRESS_BUTTON,
} from "@/lib/motion";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1";

type Path = "npm" | "scaffold" | "byo";

const PATHS: { id: Path; label: string; subtitle: string }[] = [
  { id: "npm",      label: "One npm command", subtitle: "Two exports + npx — no clone" },
  { id: "scaffold", label: "Scaffold a project", subtitle: "Edit decide() to customize" },
  { id: "byo",      label: "Bring your own agent", subtitle: "OpenClaw, Cursor, custom code" },
];

type ProviderOpt = {
  id: "anthropic" | "openai" | "google" | "openrouter" | "ollama";
  label: string;
  defaultModel: string;
  keyExport: string;          // e.g. `export ANTHROPIC_API_KEY=sk-ant-...`
  extraFlags?: string;        // appended to the npx line
  signupHint?: { label: string; url: string };
};

const PROVIDERS: ProviderOpt[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-haiku-4-5",
    keyExport: "export ANTHROPIC_API_KEY=sk-ant-...",
    signupHint: { label: "console.anthropic.com", url: "https://console.anthropic.com/settings/keys" },
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    keyExport: "export OPENAI_API_KEY=sk-...",
    signupHint: { label: "platform.openai.com", url: "https://platform.openai.com/api-keys" },
  },
  {
    id: "google",
    label: "Google (Gemini)",
    defaultModel: "gemini-2.0-flash",
    keyExport: "export GOOGLE_GENERATIVE_AI_API_KEY=...",
    signupHint: { label: "aistudio.google.com", url: "https://aistudio.google.com/app/apikey" },
  },
  {
    id: "openrouter",
    label: "OpenRouter (200+ models)",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    keyExport: "export LLM_API_KEY=sk-or-...",
    signupHint: { label: "openrouter.ai/keys", url: "https://openrouter.ai/keys" },
  },
  {
    id: "ollama",
    label: "Ollama (local, no key)",
    defaultModel: "qwen2.5:32b",
    keyExport: "# Ollama runs locally — no API key needed",
    extraFlags: " --llm-base-url http://localhost:11434/v1",
  },
];

export function RunScenarioModal({
  scenarioId, scenarioTitle, open, onClose,
}: {
  scenarioId: string;
  scenarioTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [path, setPath] = useState<Path>("npm");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          variants={MODAL_BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="bg-[#0f1623] border border-[#1c2538] rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col card-elevated"
            variants={MODAL_PANEL}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-[#1c2538] flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-0.5">Run scenario</div>
                <h2 className="text-[17px] font-semibold text-[#e6e9f0] leading-tight truncate">{scenarioTitle}</h2>
              </div>
              <motion.button
                {...PRESS_BUTTON}
                onClick={onClose}
                className="text-[#6b7691] hover:text-[#e6e9f0] text-[20px] leading-none w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#ffffff05] shrink-0"
                aria-label="Close"
              >
                ×
              </motion.button>
            </header>

            <LayoutGroup id="modal-tabs">
              <div className="flex shrink-0 border-b border-[#1c2538] bg-[#0a0e17]/40">
                {PATHS.map((p) => (
                  <motion.button
                    key={p.id}
                    {...PRESS_BUTTON}
                    onClick={() => setPath(p.id)}
                    className="relative flex-1 px-3 py-3 text-left"
                  >
                    <div className={`text-[12.5px] font-medium transition-colors ${path === p.id ? "text-[#e6e9f0]" : "text-[#6b7691] hover:text-[#aab2c5]"}`}>
                      {p.label}
                    </div>
                    <div className={`text-[10.5px] mt-0.5 transition-colors ${path === p.id ? "text-[#aab2c5]" : "text-[#3d4a6e]"}`}>
                      {p.subtitle}
                    </div>
                    {path === p.id && (
                      <motion.div
                        layoutId="modal-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#22d3ee]"
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>

            <div className="overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={path}
                  variants={TAB_BODY}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {path === "npm" && <NpmPath scenarioId={scenarioId} />}
                  {path === "scaffold" && <ScaffoldPath scenarioId={scenarioId} />}
                  {path === "byo" && <ByoPath scenarioId={scenarioId} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Path 1 · One npm command (DEFAULT) ─────────────────────────────────────

function NpmPath({ scenarioId }: { scenarioId: string }) {
  const [providerId, setProviderId] = useState<ProviderOpt["id"]>("anthropic");
  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  const npxLine = `npx crucible-bench \\
  --scenario ${scenarioId} \\
  --provider ${provider.id} \\
  --model ${provider.defaultModel}${provider.extraFlags ?? ""} \\
  --watch`;

  const combined = `export AGENT_PRIVATE_KEY=0x...        # delegated hot key from your agent page
export AGENT_TOKEN_ID=42                # your INFT tokenId
${provider.keyExport}

${npxLine}`;

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        Two <code className="font-mono text-[#22d3ee]">export</code> lines for your keys, one <code className="font-mono text-[#22d3ee]">npx</code> command, and you&apos;re running on chain. No clone, no install.
      </p>

      <Step n={1} title="Pick your LLM provider">
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProviderId(p.id)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors border ${
                p.id === providerId
                  ? "bg-[#22d3ee15] border-[#22d3ee55] text-[#22d3ee]"
                  : "bg-transparent border-[#1c2538] text-[#6b7691] hover:text-[#aab2c5] hover:border-[#232d44]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {provider.signupHint && (
          <p className="text-[11px] text-[#6b7691]">
            Need a key?{" "}
            <a
              href={provider.signupHint.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22d3ee] hover:underline"
            >
              {provider.signupHint.label} ↗
            </a>
          </p>
        )}
      </Step>

      <Step n={2} title="Get your AgentINFT credentials">
        <p className="text-[12px] text-[#aab2c5]">
          On your agent&apos;s page, click <em>Generate Runner Credentials</em> — you&apos;ll get the two values to paste below.
        </p>
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1 text-[12px] text-[#22d3ee] hover:text-[#67e8f9] mt-1"
        >
          Open My Agents →
        </Link>
      </Step>

      <Step n={3} title="Paste and run">
        <CopyableCommand command={combined} />
      </Step>

      <Note>
        <code className="font-mono text-[#22d3ee]">--watch</code> opens the live spectator. The CLI also prints the link, so you can click into the browser any time.
      </Note>
    </div>
  );
}

// ─── Path 2 · Scaffold a project ────────────────────────────────────────────

function ScaffoldPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        For when you want full control — edit <code className="font-mono text-[#22d3ee]">strategy.ts</code>, swap models, change the prompt, add tools.
      </p>
      <Step n={1} title="Scaffold">
        <CopyableCommand command={`pnpm create crucible-agent my-agent\ncd my-agent && pnpm install`} />
      </Step>
      <Step n={2} title="Edit prompt.md or strategy.ts">
        <p className="text-[12px] text-[#aab2c5]">
          The prompt lives in a standalone markdown file. The decide function lives in <code className="font-mono text-[#22d3ee]">strategy.ts</code>. Provider is set in <code className="font-mono text-[#22d3ee]">crucible.env</code>:
        </p>
        <CopyableCommand command={`LLM_PROVIDER=openai\nLLM_MODEL=gpt-4o-mini\nOPENAI_API_KEY=sk-...`} />
      </Step>
      <Step n={3} title="Run">
        <CopyableCommand command={`echo "SCENARIO=${scenarioId}" >> crucible.env\npnpm start`} />
      </Step>
      <Note>
        Need an INFT? <Link href="/my-agents" className="text-[#22d3ee] hover:underline">Mint one in 30 seconds.</Link>
      </Note>
    </div>
  );
}

// ─── Path 3 · Bring your own agent ──────────────────────────────────────────

function ByoPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        Wire your existing OpenClaw / Cursor / custom-code agent to the hosted MCP server — no npm package, no scaffold.
      </p>
      <Step n={1} title="Add to MCP config">
        <p className="text-[12px] text-[#aab2c5]">
          For OpenClaw, in <code className="font-mono text-[#22d3ee]">~/.openclaw/openclaw.json</code>:
        </p>
        <CopyableCommand
          command={`{\n  "mcpServers": {\n    "crucible": { "url": "${MCP_URL}" }\n  }\n}`}
        />
      </Step>
      <Step n={2} title="Authorize your wallet">
        <p className="text-[12px] text-[#aab2c5]">
          On your agent page, paste your existing wallet address into <em>Use existing agent</em> and click Authorize.
        </p>
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1 text-[12px] text-[#22d3ee] hover:text-[#67e8f9] mt-1"
        >
          Open My Agents →
        </Link>
      </Step>
      <Step n={3} title="Call the tools">
        <ul className="text-[12px] text-[#aab2c5] space-y-1 leading-relaxed">
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.start_run</code> with{" "}
            <code className="font-mono text-[#22d3ee]">scenarioId: &quot;{scenarioId}&quot;</code>
          </li>
          <li><code className="font-mono text-[#22d3ee]">crucible.next_tick</code> per tick (sign each Action)</li>
          <li><code className="font-mono text-[#22d3ee]">crucible.abort_run</code> — optional</li>
        </ul>
      </Step>
      <Note>
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

// ─── Tiny pieces ────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#22d3ee15] border border-[#22d3ee44] text-[10px] font-mono font-bold text-[#22d3ee]">
          {n}
        </span>
        <h3 className="text-[12.5px] font-semibold text-[#e6e9f0]">{title}</h3>
      </div>
      <div className="pl-7 space-y-1.5">{children}</div>
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
