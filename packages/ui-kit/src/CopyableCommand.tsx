"use client";
import { useState } from "react";

export interface CopyableCommandProps {
  command: string;
  label?: string;
}

export function CopyableCommand({ command, label = "Copy" }: CopyableCommandProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-[#0a0e17] border border-[#1c2538] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1c2538]">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Terminal</span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] uppercase tracking-[0.12em] text-[#22d3ee] hover:text-[#67e8f9] transition-colors font-medium"
        >
          {copied ? "✓ Copied" : label}
        </button>
      </div>
      <pre className="px-3 py-3 font-mono text-[12px] text-[#e6e9f0] overflow-x-auto whitespace-pre">{command}</pre>
    </div>
  );
}
