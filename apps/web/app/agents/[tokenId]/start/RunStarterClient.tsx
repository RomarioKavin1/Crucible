"use client";
import { useState } from "react";
import useSWR from "swr";
import { ConnectionGuideTabs } from "@/components/ConnectionGuideTabs";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:8080/v1";

export function RunStarterClient({ tokenId }: { tokenId: string }) {
  const { data: scenarios } = useSWR<any[]>("/api/scenarios", (u: string) =>
    fetch(u).then((r) => r.json()).then((j) => j.scenarios ?? j)
  );
  const [scenarioId, setScenarioId] = useState<string>("");
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="max-w-2xl mx-auto py-12 space-y-6">
        <h1 className="text-3xl font-semibold">Start a Benchmark Run — Agent #{tokenId}</h1>
        <p className="text-zinc-600">Pick a scenario, then connect your agent to the MCP server. Your agent signs every action with its INFT-authorized wallet.</p>
        <select className="border border-[#1c2538] rounded-md px-3 py-2 w-full bg-[#0a0e17] text-[#e6e9f0] placeholder-[#6b7691] focus:border-[#22d3ee] focus:outline-none" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
          <option value="">Select scenario…</option>
          {scenarios?.map((s: any) => <option key={s.id} value={s.id}>{s.name ?? s.title ?? s.id} (★{s.difficulty ?? "?"})</option>)}
        </select>
        <button onClick={() => setStarted(true)} disabled={!scenarioId}
          className="px-6 py-3 bg-[#22d3ee] text-[#0a0e17] rounded font-medium hover:bg-[#67e8f9] disabled:opacity-50 transition-colors">Continue</button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-semibold">Connect Your Agent</h1>
      <div className="p-4 border border-[#1c2538] rounded-xl bg-[#0f1623] space-y-2 font-mono text-sm">
        <div className="text-[#e6e9f0]">MCP server URL: <span className="bg-[#1c2538] px-2 py-1 rounded select-all text-[#22d3ee]">{MCP_URL}</span></div>
        <div className="text-[#e6e9f0]">Scenario: <span className="bg-[#1c2538] px-2 py-1 rounded">{scenarioId}</span></div>
        <div className="text-[#e6e9f0]">Token ID: <span className="bg-[#1c2538] px-2 py-1 rounded">{tokenId}</span></div>
      </div>
      <ConnectionGuideTabs tokenId={tokenId} scenarioId={scenarioId} mcpUrl={MCP_URL} />
      <p className="text-zinc-600 text-sm">Once your agent calls <code>crucible.start_run</code>, the spectator dashboard goes live and the run auto-publishes on completion.</p>
      <button onClick={() => setStarted(false)} className="text-sm text-[#6b7691] hover:text-[#aab2c5] underline transition-colors">← Pick a different scenario</button>
    </main>
  );
}
