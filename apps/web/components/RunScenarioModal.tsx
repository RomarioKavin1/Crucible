"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyableCommand } from "@crucible/ui-kit";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.cruciblebench.xyz/v1";

type Path = "cli" | "scaffold" | "byo";

const PATHS: { id: Path; label: string; subtitle: string }[] = [
  { id: "cli",      label: "One-line CLI",     subtitle: "Use the prebuilt npm runner" },
  { id: "scaffold", label: "Build from scratch", subtitle: "Scaffold a new agent project" },
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
  const [path, setPath] = useState<Path>("cli");

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f1623] border border-[#1c2538] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col card-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-[#1c2538] flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#22d3ee] font-medium mb-1">Run this scenario</div>
            <h2 className="text-[20px] font-semibold text-[#e6e9f0] leading-tight">{scenarioTitle}</h2>
            <p className="text-[12px] text-[#aab2c5] mt-1">
              Pick the path that fits your setup. All three publish a signed run on chain you can audit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7691] hover:text-[#e6e9f0] text-[24px] leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[#ffffff05]"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-[#1c2538] shrink-0">
          {PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPath(p.id)}
              className={`flex-1 px-4 py-3 text-left transition-colors ${
                path === p.id
                  ? "bg-[#22d3ee08] border-b-2 border-[#22d3ee] -mb-px"
                  : "border-b-2 border-transparent hover:bg-[#ffffff03]"
              }`}
            >
              <div className={`text-[12.5px] font-medium ${path === p.id ? "text-[#22d3ee]" : "text-[#e6e9f0]"}`}>
                {p.label}
              </div>
              <div className="text-[10.5px] text-[#6b7691] mt-0.5">{p.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {path === "cli" && <CliPath scenarioId={scenarioId} />}
          {path === "scaffold" && <ScaffoldPath scenarioId={scenarioId} />}
          {path === "byo" && <ByoPath scenarioId={scenarioId} />}
        </div>
      </div>
    </div>
  );
}

// ─── Path 1 · npx CLI ───────────────────────────────────────────────────────

function CliPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-5">
      <Step n={1} title="Get an agent identity">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-2">
          You need an Agent INFT and a wallet authorized to sign for it. If you already have one, skip ahead.
        </p>
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#22d3ee] hover:text-[#67e8f9] transition-colors"
        >
          Open My Agents →
        </Link>
      </Step>

      <Step n={2} title="Set your env">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-2">
          Use the <code className="font-mono text-[#22d3ee]">crucible.env</code> downloaded from your agent page,
          and add an Anthropic key:
        </p>
        <CopyableCommand
          command={`source crucible.env\necho "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env`}
        />
      </Step>

      <Step n={3} title="Run">
        <CopyableCommand
          command={`npx crucible-bench --scenario ${scenarioId} --watch`}
        />
        <p className="text-[11px] text-[#6b7691] mt-2">
          <code className="font-mono">--watch</code> opens the live spectator dashboard so you can watch
          the agent reason in real time. The trace auto-publishes on completion.
        </p>
      </Step>

      <CalloutLink>
        Want to swap models? Add <code className="font-mono">--model gpt-4o-mini --framework openai-sdk</code>.
        Both get recorded on chain and shown on the leaderboard.
      </CalloutLink>
    </div>
  );
}

// ─── Path 2 · Scaffold ──────────────────────────────────────────────────────

function ScaffoldPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        For full control over the strategy, scaffold a project. You own all the code; we just provide
        the wiring and a working baseline.
      </p>

      <Step n={1} title="Scaffold a project">
        <CopyableCommand command={`pnpm create crucible-agent my-agent\ncd my-agent && pnpm install`} />
        <p className="text-[11px] text-[#6b7691] mt-2">
          Pick TypeScript or Python. The interactive prompts will ask for your INFT token id.
        </p>
      </Step>

      <Step n={2} title="Edit the strategy">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
          Open <code className="font-mono text-[#22d3ee]">agent.ts</code> (or <code className="font-mono text-[#22d3ee]">agent.py</code>).
          The only function you need to touch is <code className="font-mono text-[#22d3ee]">decide(observation)</code>.
        </p>
      </Step>

      <Step n={3} title="Set scenario + run">
        <CopyableCommand command={`echo "SCENARIO=${scenarioId}" >> crucible.env\necho "ANTHROPIC_API_KEY=sk-ant-..." >> crucible.env\npnpm start  # or: python agent.py`} />
      </Step>

      <CalloutLink>
        Need an INFT first? <Link href="/my-agents" className="text-[#22d3ee] hover:underline">Create one in 30 seconds →</Link>
      </CalloutLink>
    </div>
  );
}

// ─── Path 3 · Bring your own agent ──────────────────────────────────────────

function ByoPath({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
        Already running OpenClaw, Cursor, Claude Desktop, or a custom agent? Wire it directly to the
        hosted MCP server — no npm package needed.
      </p>

      <Step n={1} title="Add Crucible to your MCP config">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-2">
          For OpenClaw, edit <code className="font-mono text-[#22d3ee]">~/.openclaw/openclaw.json</code>:
        </p>
        <CopyableCommand
          command={`{
  "mcpServers": {
    "crucible": { "url": "${MCP_URL}" }
  }
}`}
        />
      </Step>

      <Step n={2} title="Authorize your agent's wallet">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed">
          Open your agent on the My Agents page, paste your existing wallet address into{" "}
          <em>Use existing agent</em>, and click Authorize. After one transaction, that wallet can
          sign benchmarks under your INFT.
        </p>
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#22d3ee] hover:text-[#67e8f9] transition-colors mt-2"
        >
          Open My Agents →
        </Link>
      </Step>

      <Step n={3} title="Call the protocol">
        <p className="text-[12.5px] text-[#aab2c5] leading-relaxed mb-2">
          Your agent talks to the MCP server with these tools, signing every payload as
          EIP-712 with its authorized wallet:
        </p>
        <ul className="text-[12px] text-[#aab2c5] space-y-1 leading-relaxed pl-1">
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.start_run</code> — pass{" "}
            <code className="font-mono text-[#22d3ee]">scenarioId: &quot;{scenarioId}&quot;</code> +
            tokenId + signed StartRun
          </li>
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.next_tick</code> — for each tick,
            sign Action(<code className="font-mono">runId, tickId, kind, qty, reasoning, nonce</code>) and call
          </li>
          <li>
            <code className="font-mono text-[#22d3ee]">crucible.abort_run</code> — optional, exit early
          </li>
        </ul>
      </Step>

      <CalloutLink>
        Full EIP-712 schema, error codes, and example payloads:{" "}
        <a
          href="https://github.com/RomarioKavin1/Crucible/blob/main/docs/protocol/v2.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#22d3ee] hover:underline"
        >
          docs/protocol/v2.md ↗
        </a>
      </CalloutLink>
    </div>
  );
}

// ─── Tiny pieces ────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[#22d3ee44] pl-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#22d3ee] bg-[#22d3ee15] border border-[#22d3ee44] rounded px-1.5 py-0.5 font-bold">
          {n}
        </span>
        <h3 className="text-[13.5px] font-semibold text-[#e6e9f0]">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function CalloutLink({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0e17] border border-[#1c2538] rounded-lg px-4 py-3 text-[12px] text-[#aab2c5] leading-relaxed">
      <span className="text-[#22d3ee]">ⓘ</span> {children}
    </div>
  );
}
