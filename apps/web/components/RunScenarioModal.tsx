"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { CopyableCommand } from "@crucible/ui-kit";
import {
  MODAL_PANEL, MODAL_BACKDROP, TAB_BODY, PRESS_BUTTON,
} from "@/lib/motion";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1";

type Path = "scaffold" | "cli" | "byo";

const PATHS: { id: Path; label: string; subtitle: string }[] = [
  { id: "scaffold", label: "Build from scratch",   subtitle: "Scaffold a project, edit decide()" },
  { id: "cli",      label: "Use the CLI",          subtitle: "One command if you have an INFT" },
  { id: "byo",      label: "Bring your own agent", subtitle: "OpenClaw, Cursor, custom code" },
];

export function RunScenarioModal({
  scenarioId, scenarioTitle, open, onClose,
}: {
  scenarioId: string;
  scenarioTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [path, setPath] = useState<Path>("scaffold");

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
            {/* Header */}
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

            {/* Tab strip with sliding indicator */}
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

            {/* Body — cross-fades between tabs */}
            <div className="overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={path}
                  variants={TAB_BODY}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {path === "scaffold" && <ScaffoldPath scenarioId={scenarioId} />}
                  {path === "cli" && <CliPath scenarioId={scenarioId} />}
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

// ─── Path 1 · Scaffold (DEFAULT) ────────────────────────────────────────────

function ScaffoldPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        Generate a project, edit one function, run it. Full control over the strategy.
      </p>
      <Step n={1} title="Scaffold">
        <CopyableCommand command={`pnpm create crucible-agent my-agent\ncd my-agent && pnpm install`} />
      </Step>
      <Step n={2} title="Edit decide()">
        <p className="text-[12px] text-[#aab2c5]">
          The only function you touch in <code className="font-mono text-[#22d3ee]">agent.ts</code>:
        </p>
        <CopyableCommand command={`function decide(obs) {\n  // your strategy here\n  return { kind: "market_buy", qty: 500_000_000_000_000_000n, reasoning: "..." };\n}`} />
      </Step>
      <Step n={3} title="Run">
        <CopyableCommand command={`echo "SCENARIO=${scenarioId}" >> crucible.env\necho "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env\npnpm start`} />
      </Step>
      <Note>
        Need an INFT? <Link href="/my-agents" className="text-[#22d3ee] hover:underline">Create one in 30 seconds.</Link>
      </Note>
    </div>
  );
}

// ─── Path 2 · One-line CLI ──────────────────────────────────────────────────

function CliPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        For when you already have an agent INFT. Uses the prebuilt Anthropic baseline.
      </p>
      <Step n={1} title="Get crucible.env">
        <p className="text-[12px] text-[#aab2c5]">
          On your agent page, click <em>Download</em> in the &ldquo;Use our example&rdquo; tab.
        </p>
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1 text-[12px] text-[#22d3ee] hover:text-[#67e8f9] mt-1"
        >
          Open My Agents →
        </Link>
      </Step>
      <Step n={2} title="Run">
        <CopyableCommand command={`source crucible.env\necho "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env\nnpx crucible-bench --scenario ${scenarioId} --watch`} />
      </Step>
      <Note>
        Swap models with <code className="font-mono text-[#22d3ee]">--model gpt-4o-mini --framework openai-sdk</code> &mdash; both get recorded on chain.
      </Note>
    </div>
  );
}

// ─── Path 3 · Bring your own agent ──────────────────────────────────────────

function ByoPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        Wire your existing OpenClaw / Cursor / custom-code agent to the hosted MCP server &mdash; no npm needed.
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
          <li><code className="font-mono text-[#22d3ee]">crucible.abort_run</code> &mdash; optional</li>
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
