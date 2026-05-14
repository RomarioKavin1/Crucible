"use client";
import { useEffect, useState } from "react";
import { LiveRunReplay } from "@/components/LiveRunReplay";

export function LiveRunClient({ runId }: { runId: string }) {
  const [status, setStatus] = useState("connecting");
  const [frames, setFrames] = useState<any[]>([]);
  const [published, setPublished] = useState<any | null>(null);
  const [aborted, setAborted] = useState<any | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_MCP_URL ?? "wss://mcp.cruciblebench.xyz/v1";
    const wsUrl = base.replace(/^http/, "ws").replace(/\/v1\/?$/, "") + `/spectate/${runId}`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (msg) => {
      try {
        const f = JSON.parse(msg.data);
        setFrames((prev) => [...prev, f]);
        if (f.type === "published") setPublished(f.payload);
        if (f.type === "abort") setAborted(f.payload);
      } catch {}
    };
    return () => ws.close();
  }, [runId]);

  return (
    <main className="max-w-5xl mx-auto py-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Live Run · <code className="text-base">{runId.slice(0, 14)}…</code></h1>
        <span className="text-sm text-zinc-500">Status: {status}</span>
      </header>
      {published && (
        <div className="p-4 border rounded bg-green-50">
          ✓ Published as <a href={published.url} className="font-medium underline" target="_blank" rel="noreferrer">Run #{published.runId}</a>
          {" · "}<a href={`https://chainscan-galileo.0g.ai/tx/${published.txHash}`} target="_blank" rel="noreferrer" className="underline text-xs">tx</a>
        </div>
      )}
      {aborted && (
        <div className="p-4 border rounded bg-red-50">
          Run aborted: {aborted.reason || "(no reason)"}
        </div>
      )}
      <LiveRunReplay frames={frames} />
    </main>
  );
}
