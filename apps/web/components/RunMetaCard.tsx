"use client";
import { useEffect, useState } from "react";
import { storageDownload, storageDownloadFor, type Network } from "@/lib/network";

interface RunMeta {
  type: "meta";
  schema: number;
  tokenId?: string;
  scenarioId?: string;
  signer?: string;
  model?: string;
  framework?: string;
  agentVersion?: string;
  provider?: string;
  systemPrompt?: string;
  startedAt?: string;
}

/**
 * Reads the first line of a trace (the meta header introduced with schema=1)
 * and renders provider, model, framework, agent version, and system prompt.
 *
 * Older runs (no meta header) render nothing.
 */
export function RunMetaCard({ traceRoot, network }: { traceRoot: string; network?: Network }) {
  const [meta, setMeta] = useState<RunMeta | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = network ? storageDownloadFor(traceRoot, network) : storageDownload(traceRoot);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`storage ${res.status}`);
        const text = await res.text();
        const firstLine = text.split("\n", 1)[0]?.trim();
        if (!firstLine) return;
        const parsed = JSON.parse(firstLine);
        if (cancelled) return;
        if (parsed?.type === "meta") setMeta(parsed as RunMeta);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [traceRoot]);

  if (error) return null;            // fail silently; on-chain proof is the source of truth
  if (!meta) return null;            // older trace without meta header

  const prompt = meta.systemPrompt ?? "";
  const promptLines = prompt.split("\n");
  const preview = promptLines.slice(0, 4).join("\n");
  const overflow = promptLines.length > 4 || prompt.length > 360;

  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
      <div className="px-5 py-3 border-b border-[#1c2538] flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#e6e9f0]">Run config</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691]">
          embedded in trace · auditor-visible
        </span>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 px-5 py-4 text-[12px]">
        <MetaField label="Provider" value={meta.provider} mono />
        <MetaField label="Model" value={meta.model} mono />
        <MetaField label="Framework" value={meta.framework} mono />
        <MetaField label="Agent version" value={meta.agentVersion || "—"} mono />
      </dl>

      {prompt && (
        <div className="border-t border-[#1c2538] px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#6b7691] font-medium">
              System prompt
            </span>
            {overflow && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-[#22d3ee] hover:text-[#67e8f9] transition-colors"
              >
                {expanded ? "Collapse" : "Show full prompt"}
              </button>
            )}
          </div>
          <pre className="text-[12px] leading-[1.55] text-[#aab2c5] whitespace-pre-wrap break-words font-mono bg-[#0a0e17] border border-[#1c2538] rounded-lg p-3 overflow-x-auto">
            {expanded || !overflow ? prompt : `${preview}${overflow ? "\n…" : ""}`}
          </pre>
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-0.5">
        {label}
      </dt>
      <dd className={`text-[#e6e9f0] ${mono ? "font-mono text-[12.5px]" : "text-[12px]"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
