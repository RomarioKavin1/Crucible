"use client";
import { useState } from "react";

const TABS = ["npm CLI", "Scaffold", "OpenClaw", "Cursor"] as const;
type Tab = typeof TABS[number];

export function ConnectionGuideTabs({
  tokenId, scenarioId, mcpUrl,
}: { tokenId: string; scenarioId: string; mcpUrl: string }) {
  const [tab, setTab] = useState<Tab>("npm CLI");

  const npmExports = `export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=${tokenId}
export ANTHROPIC_API_KEY=sk-ant-...`;

  const npmRun = `npx crucible-bench \\
  --scenario ${scenarioId} \\
  --provider anthropic --model claude-haiku-4-5 \\
  --watch`;

  const scaffoldRun = `pnpm create crucible-agent my-agent
cd my-agent && pnpm install

# fill AGENT_PRIVATE_KEY, AGENT_TOKEN_ID, and your provider key in crucible.env
echo "SCENARIO=${scenarioId}" >> crucible.env
pnpm start`;

  const ocConfig = `# ~/.openclaw/openclaw.json
{
  "mcpServers": {
    "crucible": { "url": "${mcpUrl}" }
  }
}
# then in your OpenClaw chat:
# "Use crucible to start_run scenarioId=${scenarioId} tokenId=${tokenId}"`;

  const cursorConfig = `# .cursor/mcp.json
{ "mcpServers": { "crucible": { "url": "${mcpUrl}" } } }`;

  return (
    <div className="border border-[#1c2538] rounded-xl bg-[#0f1623]">
      <div className="flex border-b border-[#1c2538]">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm ${
              tab === t
                ? "bg-[#1c2538] font-medium text-[#e6e9f0]"
                : "text-[#6b7691] hover:text-[#aab2c5]"
            } transition-colors`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {tab === "npm CLI" && (
          <>
            <p className="text-[12px] text-[#aab2c5] leading-relaxed">
              Three <code className="font-mono text-[#22d3ee]">export</code>s and one <code className="font-mono text-[#22d3ee]">npx</code>. No clone, no install.
            </p>
            <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{npmExports}</pre>
            <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{npmRun}</pre>
            <p className="text-[11.5px] text-[#6b7691]">
              Swap provider via <code className="font-mono text-[#22d3ee]">--provider openai --model gpt-4o-mini</code> and replace the key export accordingly. Both get recorded on chain as the model column.
            </p>
          </>
        )}
        {tab === "Scaffold" && (
          <>
            <p className="text-[12px] text-[#aab2c5] leading-relaxed">
              For when you want to edit <code className="font-mono text-[#22d3ee]">strategy.ts</code>, the prompt, or add tools.
            </p>
            <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{scaffoldRun}</pre>
          </>
        )}
        {tab === "OpenClaw" && (
          <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{ocConfig}</pre>
        )}
        {tab === "Cursor" && (
          <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{cursorConfig}</pre>
        )}
      </div>
    </div>
  );
}
