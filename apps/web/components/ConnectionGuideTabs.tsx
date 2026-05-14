"use client";
import { useState } from "react";

const TABS = ["TS", "Python", "OpenClaw", "Cursor"] as const;
type Tab = typeof TABS[number];

export function ConnectionGuideTabs({ tokenId, scenarioId, mcpUrl }: { tokenId: string; scenarioId: string; mcpUrl: string }) {
  const [tab, setTab] = useState<Tab>("TS");
  const env = `export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=${tokenId}
export SCENARIO=${scenarioId}
export CRUCIBLE_MCP_URL=${mcpUrl}
export ANTHROPIC_API_KEY=sk-ant-...`;

  const tsRun = `git clone https://github.com/RomarioKavin1/Crucible.git
cd Crucible/examples/reference-agent-ts && pnpm install && pnpm start`;
  const pyRun = `cd Crucible/examples/reference-agent-python && pip install -e . && python agent.py`;
  const ocConfig = `# add to ~/.openclaw/openclaw.json
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
    <div className="border rounded">
      <div className="flex border-b">
        {TABS.map((t) => (
          <button key={t} className={`px-4 py-2 text-sm ${tab === t ? "bg-zinc-100 font-medium" : "text-zinc-600"}`}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {(tab === "TS" || tab === "Python") && (
          <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{env}</pre>
        )}
        {tab === "TS" && (
          <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{tsRun}</pre>
        )}
        {tab === "Python" && (
          <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">{pyRun}</pre>
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
