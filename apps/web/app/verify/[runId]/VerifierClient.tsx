"use client";
import { useState } from "react";
import { recoverTypedDataAddress } from "viem";
import { publicClient, AGENT_INFT_ADDRESS, RUN_REGISTRY_V2_ADDRESS, ABIs, readRun } from "@/lib/contracts";

const STORAGE_GATEWAY = "https://indexer-storage-testnet-turbo.0g.ai/file?root=";

const ACTION_TYPES = { Action: [
  { name: "runId", type: "bytes32" }, { name: "tickId", type: "uint32" },
  { name: "kind", type: "string" },   { name: "qty", type: "uint256" },
  { name: "reasoning", type: "string" }, { name: "nonce", type: "uint256" },
]};

interface AuditResult {
  rootMatches: boolean;
  allSigsOk: boolean;
  traceLines: number;
  signedLines: number;
  failedAt?: number;
  error?: string;
}

export function VerifierClient({ runId }: { runId: string }) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<AuditResult | null>(null);

  async function audit() {
    setStatus("running");
    setResult(null);
    try {
      const run = await readRun(BigInt(runId));
      const traceText = await fetch(STORAGE_GATEWAY + run.traceRoot).then((r) => {
        if (!r.ok) throw new Error(`storage fetch failed: ${r.status}`);
        return r.text();
      });

      // sha-256 of trace bytes for root match
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(traceText));
      const traceHashHex = "0x" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const rootMatches = traceHashHex.toLowerCase() === run.traceRoot.toLowerCase();

      const lines = traceText.trim().split("\n").filter(Boolean);
      const domain = { name: "CrucibleBench", version: "2", chainId: 16602, verifyingContract: RUN_REGISTRY_V2_ADDRESS };

      let allSigsOk = true;
      let signedLines = 0;
      let failedAt: number | undefined;

      for (let i = 0; i < lines.length; i++) {
        const e = JSON.parse(lines[i]!);
        if (!e.signature || !e.signer) continue;  // unsigned lines (engine-recorded but no signature) — skip
        signedLines++;
        const recovered = await recoverTypedDataAddress({
          domain, types: ACTION_TYPES, primaryType: "Action",
          message: {
            runId: e.action.runId, tickId: e.action.tickId, kind: e.action.kind,
            qty: BigInt(e.action.qty), reasoning: e.action.reasoning, nonce: BigInt(e.action.nonce),
          },
          signature: e.signature as `0x${string}`,
        });
        if (recovered.toLowerCase() !== e.signer.toLowerCase()) { allSigsOk = false; failedAt = i; break; }
        const ok = await publicClient.readContract({
          address: AGENT_INFT_ADDRESS, abi: ABIs.AGENT_INFT_ABI,
          functionName: "isAuthorized", args: [run.tokenId, e.signer as `0x${string}`],
        }) as boolean;
        if (!ok) { allSigsOk = false; failedAt = i; break; }
      }

      setResult({ rootMatches, allSigsOk, traceLines: lines.length, signedLines, failedAt });
      setStatus("done");
    } catch (e) {
      setResult({ rootMatches: false, allSigsOk: false, traceLines: 0, signedLines: 0, error: String(e) });
      setStatus("error");
    }
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Verify Run #{runId}</h1>
      <p className="text-zinc-600">Pulls the trace from 0G Storage, verifies trace root + EIP-712 signatures + INFT authorization for every signed entry. No trust in Crucible required.</p>
      <button onClick={audit} disabled={status === "running"}
        className="px-6 py-3 bg-black text-white rounded disabled:opacity-50">
        {status === "running" ? "Auditing…" : "Run audit"}
      </button>
      {result && (
        <div className="space-y-2">
          {result.error && <div className="p-4 border rounded bg-red-50 text-red-700">{result.error}</div>}
          {!result.error && (
            <ul className="space-y-1 text-sm">
              <li>{result.rootMatches ? "✓" : "✗"} Trace root matches sha256(trace)</li>
              <li>{result.allSigsOk ? "✓" : "✗"} All {result.signedLines} signed entries verified ({result.traceLines} total lines)</li>
              {result.failedAt !== undefined && <li className="text-red-700">Failed at trace line #{result.failedAt}</li>}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
